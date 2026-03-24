import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: lti-oidc-login
//
// Handles OIDC Third-Party Login Initiation (Step 1 of LTI 1.3 Launch).
//
// Flow:
//   1. External platform (Canvas/Moodle) sends POST/GET with:
//      - iss (issuer URL)
//      - login_hint (platform user identifier)
//      - target_link_uri (where user wants to go)
//      - lti_message_hint (optional, opaque)
//   2. We validate the issuer against lti_platform_registrations
//   3. Generate state + nonce, store in lti_nonces table
//   4. Redirect (302) to platform's auth_endpoint with OIDC params
//
// No Supabase auth — this is called by external platforms.
// Uses service_role key for DB access.
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

function errorHtml(title: string, detail: string, status = 400) {
  return new Response(
    `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>EduSync LTI Error</title>
<style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f5f5f5}
.card{background:white;padding:2rem;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:480px;text-align:center}
h1{color:#dc2626;font-size:1.25rem}p{color:#6b7280}</style></head>
<body><div class="card"><h1>${title}</h1><p>${detail}</p></div></body></html>`,
    {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
    }
  )
}

/**
 * Generate a cryptographically random string for state/nonce.
 */
function generateRandomString(length = 32): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse params from either GET query string or POST form body.
 */
async function parseParams(req: Request): Promise<URLSearchParams> {
  if (req.method === 'GET') {
    return new URL(req.url).searchParams
  }

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const body = await req.text()
    return new URLSearchParams(body)
  }

  if (contentType.includes('application/json')) {
    const json = await req.json()
    return new URLSearchParams(json)
  }

  // Fallback: try form-encoded
  const body = await req.text()
  return new URLSearchParams(body)
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Parse incoming parameters
    const params = await parseParams(req)
    const iss = params.get('iss')
    const loginHint = params.get('login_hint')
    const targetLinkUri = params.get('target_link_uri')
    const ltiMessageHint = params.get('lti_message_hint')
    const clientId = params.get('client_id') // Some platforms send this

    // Validate required params
    if (!iss) {
      return errorHtml('Parameter Tidak Valid', 'Parameter "iss" (issuer) wajib diisi.')
    }
    if (!loginHint) {
      return errorHtml('Parameter Tidak Valid', 'Parameter "login_hint" wajib diisi.')
    }

    // 2. Look up platform registration
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    let query = supabase
      .from('lti_platform_registrations')
      .select('id, tenant_id, client_id, auth_endpoint, deployment_id')
      .eq('issuer', iss)
      .eq('is_active', true)

    // If client_id is provided, use it for more precise matching
    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: platforms, error: dbError } = await query.limit(1)

    if (dbError) {
      console.error('LTI_OIDC_LOGIN_DB_ERROR', dbError)
      return errorHtml('Kesalahan Server', 'Gagal memuat konfigurasi platform.')
    }

    if (!platforms || platforms.length === 0) {
      console.error('LTI_OIDC_LOGIN_UNKNOWN_ISS', { iss, clientId })
      return errorHtml(
        'Platform Tidak Terdaftar',
        `Platform dengan issuer "${iss}" belum terdaftar di EduSync. Hubungi administrator.`
      )
    }

    const platform = platforms[0]

    // 3. Generate state + nonce
    const state = generateRandomString(32)
    const nonce = generateRandomString(32)

    // Build our launch callback URL
    const ltiLaunchUrl = Deno.env.get('LTI_LAUNCH_URL') ?? `${supabaseUrl}/functions/v1/lti-launch`

    // 4. Store nonce for validation in lti-launch
    const { error: nonceError } = await supabase.from('lti_nonces').insert({
      nonce,
      state,
      tenant_id: platform.tenant_id,
      platform_id: platform.id,
      redirect_uri: targetLinkUri ?? null,
    })

    if (nonceError) {
      console.error('LTI_OIDC_LOGIN_NONCE_ERROR', nonceError)
      return errorHtml('Kesalahan Server', 'Gagal menyimpan state OIDC.')
    }

    // 5. Build OIDC authorization redirect URL
    const authUrl = new URL(platform.auth_endpoint)
    authUrl.searchParams.set('response_type', 'id_token')
    authUrl.searchParams.set('response_mode', 'form_post')
    authUrl.searchParams.set('scope', 'openid')
    authUrl.searchParams.set('client_id', platform.client_id)
    authUrl.searchParams.set('redirect_uri', ltiLaunchUrl)
    authUrl.searchParams.set('login_hint', loginHint)
    authUrl.searchParams.set('state', state)
    authUrl.searchParams.set('nonce', nonce)
    authUrl.searchParams.set('prompt', 'none')

    if (ltiMessageHint) {
      authUrl.searchParams.set('lti_message_hint', ltiMessageHint)
    }

    console.log(
      JSON.stringify({
        component: 'lti-oidc-login',
        stage: 'redirect',
        iss,
        platform_id: platform.id,
        tenant_id: platform.tenant_id,
      })
    )

    // 6. Redirect to platform's OIDC authorization endpoint
    return new Response(null, {
      status: 302,
      headers: {
        Location: authUrl.toString(),
        ...corsHeaders,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('LTI_OIDC_LOGIN_ERROR', message)
    return errorHtml('Kesalahan Server', 'Terjadi kesalahan saat memproses login LTI.')
  }
})
