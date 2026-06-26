import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, method: rawMethod = 'GET', body = null } = await req.json()
    const method = String(rawMethod).toUpperCase()

    // Validate endpoint to prevent SSRF — must resolve to api.mercadolibre.com
    let targetUrl: URL
    try {
      targetUrl = new URL(endpoint, 'https://api.mercadolibre.com')
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    if (targetUrl.hostname !== 'api.mercadolibre.com' || targetUrl.protocol !== 'https:') {
      return new Response(JSON.stringify({ error: 'Forbidden endpoint' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders })

    const { data: token } = await supabase
      .from('ml_tokens')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!token) return new Response('Não autenticado', { status: 401, headers: corsHeaders })

    // Check if token expired
    const isExpired = new Date(token.expires_at) < new Date()
    let accessToken = token.access_token

    if (isExpired) {
        // Refresh token logic
        const refreshRes = await fetch('https://api.mercadolibre.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: Deno.env.get('ML_CLIENT_ID')!,
                client_secret: Deno.env.get('ML_CLIENT_SECRET')!,
                refresh_token: token.refresh_token
            })
        })
        const refreshData = await refreshRes.json()
        if (refreshData.access_token) {
            accessToken = refreshData.access_token
            const expiresAt = new Date(Date.now() + refreshData.expires_in * 1000)
            await supabase.from('ml_tokens').update({
                access_token: refreshData.access_token,
                refresh_token: refreshData.refresh_token,
                expires_at: expiresAt.toISOString()
            }).eq('id', token.id)
        }
    }

    const fetchHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
    if (accessToken) fetchHeaders.Authorization = `Bearer ${accessToken}`

    let res = await fetch(targetUrl.toString(), {
      method,
      headers: fetchHeaders,
      body: body ? JSON.stringify(body) : null
    })

    // Alguns itens públicos do ML retornam 403 em /items/{id} sem Bearer.
    // Para esses casos, tentamos o endpoint em lote com token; se o próprio ML
    // bloquear por PolicyAgent, devolvemos erro controlado (200) para o front
    // exibir toast e manter o preenchimento manual, sem derrubar a tela.
    const itemMatch = targetUrl.pathname.match(/^\/items\/(MLB\d+)$/i)
    if (method === 'GET' && itemMatch && res.status === 403) {
      const itemId = itemMatch[1].toUpperCase()
      const batchUrl = new URL('/items', 'https://api.mercadolibre.com')
      batchUrl.searchParams.set('ids', itemId)

      const batchRes = await fetch(batchUrl.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })

      const batchText = await batchRes.text()
      let batchData
      try {
        batchData = batchText ? JSON.parse(batchText) : null
      } catch (_error) {
        batchData = { error: batchText || 'Resposta inválida do Mercado Livre' }
      }

      if (batchRes.ok) {
        const first = Array.isArray(batchData) ? batchData[0] : null
        if (first?.code === 200 && first?.body) {
          return new Response(JSON.stringify(first.body), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      console.error('ML API item fallback blocked', {
        endpoint,
        status: batchRes.status,
        data: batchData,
      })

      return new Response(JSON.stringify({
        error: 'Mercado Livre bloqueou o acesso automático a este anúncio. Preencha os dados manualmente.',
        ml_status: res.status,
        ml_endpoint: endpoint,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const descriptionMatch = targetUrl.pathname.match(/^\/items\/(MLB\d+)\/description$/i)
    if (method === 'GET' && descriptionMatch && res.status === 403) {
      return new Response(JSON.stringify({ plain_text: '', text: '' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }


    const text = await res.text()
    let data
    try {
      data = text ? JSON.parse(text) : null
    } catch (_error) {
      data = { error: text || 'Resposta inválida do Mercado Livre' }
    }

    if (!res.ok) {
      console.error('ML API error', { endpoint, status: res.status, data })
      data = { ...data, ml_status: res.status, ml_endpoint: endpoint }
    }
    
    return new Response(JSON.stringify(data), {
      status: res.ok ? 200 : res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
