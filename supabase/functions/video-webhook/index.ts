import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const webhookSecret = Deno.env.get('VIDEO_WEBHOOK_SECRET')
    if (webhookSecret) {
      const signature = req.headers.get('mux-signature') || req.headers.get('bunnynet-signature')
      if (!signature) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      // In production: verify HMAC signature here
    }

    const body = await req.json()
    const { type, data } = body

    if (type === 'video.asset.ready' && data) {
      // Mux webhook: asset is ready
      const { id: providerAssetId, playback_ids, duration, max_stored_resolution } = data
      const playbackId = playback_ids?.[0]?.id
      const hlsUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null
      const thumbnailUrl = playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null

      const { error } = await supabase
        .from('video_assets')
        .update({
          status: 'ready',
          playback_id: playbackId,
          hls_url: hlsUrl,
          thumbnail_url: thumbnailUrl,
          duration_seconds: Math.round(duration || 0),
          resolution: max_stored_resolution,
          updated_at: new Date().toISOString(),
        })
        .eq('provider_asset_id', providerAssetId)

      if (error) throw error
    } else if (type === 'video.asset.errored' && data) {
      const { id: providerAssetId, errors } = data
      const { error } = await supabase
        .from('video_assets')
        .update({
          status: 'error',
          error_message: errors?.messages?.[0] || 'Proses video gagal',
          updated_at: new Date().toISOString(),
        })
        .eq('provider_asset_id', providerAssetId)
      if (error) throw error
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
