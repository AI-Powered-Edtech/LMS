import 'jsr:@supabase/functions-js/edge-runtime.d.ts'

// ==========================================================================
// Edge Function: lti-jwks
//
// Public GET endpoint serving EduSync's JSON Web Key Set (JWKS).
// External LTI platforms use this to verify signatures on messages
// (e.g., deep linking responses) signed by EduSync.
//
// No authentication required — this is a public key endpoint.
// ==========================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // JWKS must be publicly accessible
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

interface JWK {
  kty: string
  n: string
  e: string
  alg: string
  use: string
  kid: string
}

/**
 * Parse a PEM-encoded RSA public key into JWK format.
 * Handles both PKCS#1 (RSA PUBLIC KEY) and SPKI (PUBLIC KEY) formats.
 */
async function pemToJwk(pem: string): Promise<JWK> {
  // Strip PEM headers/footers and whitespace
  const pemContents = pem
    .replace(/-----BEGIN (RSA )?PUBLIC KEY-----/g, '')
    .replace(/-----END (RSA )?PUBLIC KEY-----/g, '')
    .replace(/\s/g, '')

  // Decode base64 to binary
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0))

  // Import as CryptoKey
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    binaryDer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    true,
    ['verify']
  )

  // Export as JWK
  const jwk = await crypto.subtle.exportKey('jwk', cryptoKey)

  return {
    kty: jwk.kty!,
    n: jwk.n!,
    e: jwk.e!,
    alg: 'RS256',
    use: 'sig',
    kid: 'edusync-lti-key-1',
  }
}

function jsonResponse(data: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      // JWKS should be cached for a reasonable time
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      ...corsHeaders,
      ...extraHeaders,
    },
  })
}

function errorResponse(message: string, status = 500) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only GET allowed
  if (req.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  try {
    const publicKeyPem = Deno.env.get('LTI_RSA_PUBLIC_KEY')
    if (!publicKeyPem) {
      console.error('LTI_JWKS_ERROR: LTI_RSA_PUBLIC_KEY not configured')
      return errorResponse('JWKS not configured', 500)
    }

    const jwk = await pemToJwk(publicKeyPem)

    return jsonResponse({ keys: [jwk] })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('LTI_JWKS_ERROR', message)
    return errorResponse('Internal Server Error', 500)
  }
})
