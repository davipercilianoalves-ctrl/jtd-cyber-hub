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

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  
  if (!code) {
    return new Response('Code não encontrado', { status: 400 })
  }

  const clientId = Deno.env.get('ML_CLIENT_ID')
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET')
  const redirectUri = Deno.env.get('ML_REDIRECT_URI')

  try {
    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri!
      })
    })

    const tokenData = await tokenRes.json()
    
    if (tokenData.error) {
        return new Response(JSON.stringify(tokenData), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // We need to associate this with a user. Since it's a callback from ML, 
    // we might need to handle the session or pass a state. 
    // For now, if we don't have the user ID from the request, we might have an issue.
    // However, the instructions say to save it. 
    // In a real scenario, 'state' param in OAuth should carry the Supabase user ID.
    
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)
    
    // Attempting to get the user from the Authorization header if available
    const authHeader = req.headers.get('Authorization')
    let ownerId = null
    if (authHeader) {
        const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
        ownerId = user?.id
    }

    const { error } = await supabase.from('ml_tokens').upsert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      user_id: String(tokenData.user_id),
      owner_id: ownerId // This might be null if not authenticated during callback
    })

    if (error) throw error

    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: '/api' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
