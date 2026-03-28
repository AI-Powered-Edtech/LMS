import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

// ==========================================================================
// Edge Function: lti-launch
//
// Handles the LTI 1.3 Launch (Step 2) — receives and validates the OIDC
// id_token from the external platform, provisions a user session, and
// redirects to the EduSync lesson/course.
//
// Flow:
//   1. Receive POST with id_token + state (form-encoded from platform)
//   2. Validate state against lti_nonces (replay protection)
//   3. Fetch platform JWKS and verify id_token signature
//   4. Validate LTI-specific claims
//   5. Provision or find Supabase user (lti-guest role)
//   6. Generate magic link session token
//   7. Redirect to /#/lti/callback?token=...&redirect=...
//
// No Supabase auth — validates LTI id_token internally.
// Uses service_role key for user provisioning.
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// LTI 1.3 claim URIs
const LTI_CLAIMS = {
  MESSAGE_TYPE: 'https://purl.imsglobal.org/spec/lti/claim/message_type',
  VERSION: 'https://purl.imsglobal.org/spec/lti/claim/version',
  DEPLOYMENT_ID: 'https://purl.imsglobal.org/spec/lti/claim/deployment_id',
  TARGET_LINK_URI: 'https://purl.imsglobal.org/spec/lti/claim/target_link_uri',
  RESOURCE_LINK: 'https://purl.imsglobal.org/spec/lti/claim/resource_link',
  ROLES: 'https://purl.imsglobal.org/spec/lti/claim/roles',
  CONTEXT: 'https://purl.imsglobal.org/spec/lti/claim/context',
} as const

// ── Helpers ─────────────────────────────────────────────────────

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
 * Base64url decode (no padding).
 */
function base64urlDecode(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/**
 * Decode JWT without verification (to extract header for kid lookup).
 */
function decodeJwtUnsafe(token: string): {
  header: Record<string, unknown>
  payload: Record<string, unknown>
} {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('INVALID_JWT_FORMAT')

  const header = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[0])))
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(parts[1])))

  return { header, payload }
}

/**
 * Fetch the platform's JWKS and find the key matching the kid.
 */
async function fetchPlatformKey(jwksUrl: string, kid: string): Promise<CryptoKey> {
  const response = await fetch(jwksUrl, {
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`JWKS_FETCH_FAILED: ${response.status}`)
  }

  const jwks = await response.json()
  const keys = jwks.keys as Array<Record<string, unknown>>

  if (!keys || keys.length === 0) {
    throw new Error('JWKS_EMPTY')
  }

  // Find key by kid, or use first key if no kid match
  const jwk = kid ? (keys.find((k) => k.kid === kid) ?? keys[0]) : keys[0]

  // Import as CryptoKey for verification
  return crypto.subtle.importKey(
    'jwk',
    jwk as JsonWebKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  )
}

/**
 * Verify JWT signature using the platform's public key.
 */
async function verifyJwt(token: string, key: CryptoKey): Promise<Record<string, unknown>> {
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('INVALID_JWT_FORMAT')

  const [headerB64, payloadB64, signatureB64] = parts

  // Verify signature
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
  const signature = base64urlDecode(signatureB64)

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, signature, data)

  if (!valid) {
    throw new Error('JWT_SIGNATURE_INVALID')
  }

  // Decode and return payload
  const payload = JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64)))

  // Validate exp
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && payload.exp < now) {
    throw new Error('JWT_EXPIRED')
  }

  // Validate iat (not in the future, with 60s leeway)
  if (payload.iat && payload.iat > now + 60) {
    throw new Error('JWT_IAT_FUTURE')
  }

  return payload
}

// ── Main Handler ────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorHtml('Metode Tidak Valid', 'Endpoint ini hanya menerima POST.', 405)
  }

  const startTime = Date.now()

  try {
    // 1. Parse form-encoded body (platform sends as form_post)
    const body = await req.text()
    const params = new URLSearchParams(body)
    const idToken = params.get('id_token')
    const state = params.get('state')

    if (!idToken) {
      return errorHtml('Token Tidak Valid', 'Parameter "id_token" tidak ditemukan.')
    }
    if (!state) {
      return errorHtml('State Tidak Valid', 'Parameter "state" tidak ditemukan.')
    }

    // 2. Initialize Supabase (service role for admin operations)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    })

    // 3. Validate state against lti_nonces (replay protection)
    const { data: nonceRecord, error: nonceError } = await supabase
      .from('lti_nonces')
      .select('nonce, tenant_id, platform_id, redirect_uri, expires_at')
      .eq('state', state)
      .limit(1)
      .single()

    if (nonceError || !nonceRecord) {
      console.error('LTI_LAUNCH_NONCE_NOT_FOUND', { state, error: nonceError })
      return errorHtml(
        'State Tidak Valid',
        'Sesi OIDC tidak ditemukan atau sudah kadaluarsa. Silakan coba lagi dari platform Anda.'
      )
    }

    // Check expiry
    if (new Date(nonceRecord.expires_at) < new Date()) {
      // Clean up expired nonce
      await supabase.from('lti_nonces').delete().eq('nonce', nonceRecord.nonce)
      return errorHtml(
        'Sesi Kadaluarsa',
        'Sesi login LTI sudah kadaluarsa. Silakan coba lagi dari platform Anda.'
      )
    }

    // Delete nonce (one-time use)
    await supabase.from('lti_nonces').delete().eq('nonce', nonceRecord.nonce)

    // 4. Decode JWT header to get kid for key lookup
    const { header, payload: unsafePayload } = decodeJwtUnsafe(idToken)
    const kid = header.kid as string | undefined

    // 5. Fetch platform registration for JWKS URL
    const { data: platform, error: platformError } = await supabase
      .from('lti_platform_registrations')
      .select('id, tenant_id, client_id, jwks_url, issuer, deployment_id')
      .eq('id', nonceRecord.platform_id)
      .eq('is_active', true)
      .single()

    if (platformError || !platform) {
      console.error('LTI_LAUNCH_PLATFORM_NOT_FOUND', { platformId: nonceRecord.platform_id })
      return errorHtml('Platform Tidak Ditemukan', 'Konfigurasi platform tidak valid.')
    }

    // 6. Verify JWT signature against platform's JWKS
    const publicKey = await fetchPlatformKey(platform.jwks_url, kid ?? '')
    const claims = await verifyJwt(idToken, publicKey)

    // 7. Validate standard OIDC claims
    if (claims.iss !== platform.issuer) {
      throw new Error(`ISS_MISMATCH: expected ${platform.issuer}, got ${claims.iss}`)
    }

    // aud can be string or array
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
    if (!aud.includes(platform.client_id)) {
      throw new Error(`AUD_MISMATCH: expected ${platform.client_id}, got ${claims.aud}`)
    }

    // Validate nonce in token matches our stored nonce
    if (claims.nonce !== nonceRecord.nonce) {
      throw new Error('NONCE_MISMATCH')
    }

    // 8. Validate LTI-specific claims
    const messageType = claims[LTI_CLAIMS.MESSAGE_TYPE]
    if (messageType !== 'LtiResourceLinkRequest') {
      console.error('LTI_LAUNCH_INVALID_MESSAGE_TYPE', { messageType })
      return errorHtml(
        'Tipe Pesan Tidak Didukung',
        `Tipe "${messageType}" belum didukung. Hanya LtiResourceLinkRequest yang didukung.`
      )
    }

    const ltiVersion = claims[LTI_CLAIMS.VERSION]
    if (ltiVersion !== '1.3.0') {
      return errorHtml(
        'Versi LTI Tidak Didukung',
        `Versi LTI "${ltiVersion}" tidak didukung. Diperlukan versi 1.3.0.`
      )
    }

    // Extract user info from claims
    const platformSub = claims.sub as string
    const userName = (claims.name as string) || (claims.given_name as string) || 'LTI User'
    const userEmail = claims.email as string | undefined
    const ltiRoles = (claims[LTI_CLAIMS.ROLES] as string[]) ?? []
    const contextClaim = claims[LTI_CLAIMS.CONTEXT] as Record<string, unknown> | undefined
    const resourceLinkClaim = claims[LTI_CLAIMS.RESOURCE_LINK] as
      | Record<string, unknown>
      | undefined
    const targetLinkUri = (claims[LTI_CLAIMS.TARGET_LINK_URI] as string) ?? nonceRecord.redirect_uri

    if (!platformSub) {
      throw new Error('MISSING_SUB_CLAIM')
    }

    // 9. Provision or find existing user
    const tenantId = platform.tenant_id

    // Check for existing LTI session with this platform user
    const { data: existingSession } = await supabase
      .from('lti_sessions')
      .select('user_id')
      .eq('platform_registration_id', platform.id)
      .eq('platform_sub', platformSub)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    let userId: string

    if (existingSession?.user_id) {
      userId = existingSession.user_id

      // Update user metadata if needed
      await supabase.auth.admin.updateUserById(userId, {
        app_metadata: {
          tenant_id: tenantId,
          lti_guest: true,
          lti_platform_id: platform.id,
        },
        user_metadata: {
          full_name: userName,
        },
      })
    } else {
      // Create new user
      // Use a deterministic email based on platform + sub to avoid collisions
      const ltiEmail =
        userEmail || `lti-${platform.id.slice(0, 8)}-${platformSub}@lti.edusync.internal`

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: ltiEmail,
        email_confirm: true, // Auto-confirm — no email verification needed for LTI
        app_metadata: {
          tenant_id: tenantId,
          lti_guest: true,
          lti_platform_id: platform.id,
        },
        user_metadata: {
          full_name: userName,
          lti_sub: platformSub,
        },
      })

      if (createError) {
        // If user already exists (email collision), try to find them
        if (createError.message?.includes('already been registered')) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers({
            page: 1,
            perPage: 1,
          })
          // Lookup by email using a targeted approach
          const { data: profileMatch } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', ltiEmail)
            .single()

          if (profileMatch) {
            userId = profileMatch.id
          } else {
            throw new Error(`USER_CREATE_FAILED: ${createError.message}`)
          }
        } else {
          throw new Error(`USER_CREATE_FAILED: ${createError.message}`)
        }
      } else {
        userId = newUser.user!.id
      }

      // Ensure profile exists
      await supabase.from('profiles').upsert(
        {
          id: userId,
          email: ltiEmail,
          full_name: userName,
          tenant_id: tenantId,
        },
        { onConflict: 'id' }
      )

      // Assign lti-guest role (or student if applicable)
      // Map LTI roles to EduSync roles
      const ltiRoleUrls = ltiRoles.map((r: string) => r.toLowerCase())
      const isInstructor = ltiRoleUrls.some(
        (r: string) =>
          r.includes('instructor') || r.includes('teacher') || r.includes('contentdeveloper')
      )
      const eduSyncRole = isInstructor ? 'teacher' : 'student'

      await supabase.from('user_roles').upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          role: eduSyncRole,
        },
        { onConflict: 'user_id,tenant_id' }
      )
    }

    // 10. Create LTI session record
    await supabase.from('lti_sessions').insert({
      tenant_id: tenantId,
      platform_registration_id: platform.id,
      platform_sub: platformSub,
      user_id: userId,
      lti_roles: ltiRoles,
      context_id: contextClaim?.id as string | undefined,
      resource_link_id: resourceLinkClaim?.id as string | undefined,
      target_link_uri: targetLinkUri,
    })

    // 11. Generate magic link for session
    const ltiEmail =
      userEmail || `lti-${platform.id.slice(0, 8)}-${platformSub}@lti.edusync.internal`

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: ltiEmail,
      options: {
        redirectTo: `${appUrl}/#/lti/callback`,
      },
    })

    if (linkError || !linkData) {
      console.error('LTI_LAUNCH_LINK_ERROR', linkError)
      throw new Error('SESSION_GENERATION_FAILED')
    }

    // Extract token_hash from the generated link
    const generatedUrl = new URL(linkData.properties.action_link)
    const tokenHash =
      generatedUrl.searchParams.get('token') ??
      generatedUrl.hash?.split('token=')[1]?.split('&')[0] ??
      ''

    // Parse the hashed_token from the verification URL
    const verificationToken = linkData.properties.hashed_token

    // Build redirect URL
    const redirectPath = targetLinkUri ?? '/app/student/courses'
    const callbackUrl = new URL(`${appUrl}/#/lti/callback`)

    // We'll pass params via fragment hash to keep tokens out of server logs
    const finalRedirect =
      `${appUrl}/#/lti/callback` +
      `?token=${encodeURIComponent(verificationToken)}` +
      `&type=magiclink` +
      `&redirect=${encodeURIComponent(redirectPath)}`

    const latencyMs = Date.now() - startTime
    console.log(
      JSON.stringify({
        component: 'lti-launch',
        stage: 'success',
        platform_id: platform.id,
        tenant_id: tenantId,
        user_id: userId,
        is_new_user: !existingSession,
        latency_ms: latencyMs,
      })
    )

    // 12. Redirect to the app callback
    return new Response(null, {
      status: 302,
      headers: {
        Location: finalRedirect,
        ...corsHeaders,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    const latencyMs = Date.now() - startTime
    console.error('LTI_LAUNCH_ERROR', { error: message, latency_ms: latencyMs })

    // Map known errors
    if (message.includes('JWT_SIGNATURE_INVALID')) {
      return errorHtml(
        'Tanda Tangan Tidak Valid',
        'Token dari platform tidak dapat diverifikasi. Pastikan konfigurasi JWKS benar.'
      )
    }
    if (message.includes('JWT_EXPIRED')) {
      return errorHtml('Token Kadaluarsa', 'Token login sudah kadaluarsa. Silakan coba lagi.')
    }
    if (message.includes('NONCE_MISMATCH')) {
      return errorHtml('Nonce Tidak Cocok', 'Sesi OIDC tidak valid. Silakan coba lagi.')
    }
    if (message.includes('ISS_MISMATCH') || message.includes('AUD_MISMATCH')) {
      return errorHtml(
        'Konfigurasi Tidak Cocok',
        'Issuer atau audience tidak sesuai dengan registrasi platform.'
      )
    }

    return errorHtml('Kesalahan Server', 'Terjadi kesalahan saat memproses LTI launch.')
  }
})
