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
    const { code, state } = await req.json()

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Code não encontrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientId = Deno.env.get('ML_CLIENT_ID')
    const clientSecret = Deno.env.get('ML_CLIENT_SECRET')
    const redirectUri = Deno.env.get('ML_REDIRECT_URI')

    const tokenRes = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId!,
        client_secret: clientSecret!,
        code,
        redirect_uri: redirectUri!,
      }),
    })

    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      return new Response(
        JSON.stringify({ error: tokenData.error_description || tokenData.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let ownerId: string | null = null
    if (state) {
      const { data: { user } } = await supabase.auth.getUser(state)
      ownerId = user?.id ?? null
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000)

    if (ownerId) {
      await supabase.from('ml_tokens').delete().eq('owner_id', ownerId)
    }

    const { error } = await supabase.from('ml_tokens').insert({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: expiresAt.toISOString(),
      user_id: String(tokenData.user_id),
      owner_id: ownerId,
    })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
