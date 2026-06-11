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
    const { endpoint, method = 'GET', body = null } = await req.json()
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (!user) return new Response('Unauthorized', { status: 401 })

    const { data: token } = await supabase
      .from('ml_tokens')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (!token) return new Response('Não autenticado', { status: 401 })

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

    const res = await fetch(`https://api.mercadolibre.com${endpoint}`, {
      method,
      headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : null
    })

    const data = await res.json()
    
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
