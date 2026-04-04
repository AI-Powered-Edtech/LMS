// =============================================================
// EduSync LMS — Edge Function: send-push
// =============================================================
// Mengirim Web Push notification ke perangkat pengguna.
//
// PERHATIAN — Kebutuhan produksi:
//   1. VAPID keys: generate dengan `npx web-push generate-vapid-keys`
//      Simpan di Supabase Secrets:
//        VAPID_PUBLIC_KEY  = "..."
//        VAPID_PRIVATE_KEY = "..."
//        VAPID_SUBJECT     = "mailto:admin@edusync.app"
//
//   2. Web Push spec: RFC 8030 + RFC 8291 (message encryption)
//      Library yang direkomendasikan untuk Deno:
//        https://esm.sh/web-push@3.6.7
//      atau gunakan implementasi manual dengan SubtleCrypto API Deno.
//
// Payload yang diterima:
//   {
//     subscription: {
//       endpoint: string,
//       keys: { p256dh: string, auth: string }
//     },
//     notification: {
//       title: string,
//       body: string,
//       icon?: string,
//       url?: string
//     }
//   }
//
// Catatan keamanan:
//   - Endpoint memerlukan autentikasi JWT pengguna yang valid
//   - Hanya mengirim ke subscription milik user yang sedang login
//   - Tidak menyimpan subscription key di dalam fungsi ini —
//     subscription disimpan di notification_preferences.push_subscription
// =============================================================

import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { jsonResponse, errorResponse } from '../_shared/response.ts'
import { authenticate, type AuthResult } from '../_shared/auth.ts'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

interface PushSubscription {
  endpoint: string
  keys: PushSubscriptionKeys
}

interface PushNotification {
  title: string
  body: string
  icon?: string
  url?: string
  badge?: string
  tag?: string
  data?: Record<string, unknown>
}

interface SendPushRequest {
  subscription: PushSubscription
  notification: PushNotification
  /** user_id opsional — jika diisi, diverifikasi terhadap JWT */
  user_id?: string
}

interface SendPushResponse {
  success: boolean
  message: string
  timestamp: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Konversi base64url ke Uint8Array (diperlukan untuk SubtleCrypto) */
function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(base64url.length + ((4 - (base64url.length % 4)) % 4), '=')
  const binary = atob(base64)
  return Uint8Array.from(binary, (c) => c.charCodeAt(0))
}

/** Encode VAPID JWT untuk header Authorization Web Push */
async function buildVapidAuthHeader(
  audience: string,
  subject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  // Buat JWT header + payload
  const header = { typ: 'JWT', alg: 'ES256' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 jam
    sub: subject,
  }

  const encode = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')

  const unsignedToken = `${encode(header)}.${encode(payload)}`

  // Import VAPID private key (PKCS8 format dari base64url)
  const privateKeyBytes = base64urlToUint8Array(vapidPrivateKey)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKeyBytes,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  // Sign dengan ECDSA P-256 SHA-256
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  )

  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  const jwt = `${unsignedToken}.${signature}`
  return `vapid t=${jwt}, k=${vapidPublicKey}`
}

/**
 * Enkripsi payload notifikasi menggunakan Web Push Message Encryption (RFC 8291).
 * Implementasi penuh memerlukan ECDH key exchange + AES-128-GCM.
 *
 * TODO (produksi): Gunakan library web-push atau implementasi penuh RFC 8291.
 * Fungsi ini adalah placeholder yang mengembalikan plain JSON untuk dev.
 */
async function encryptPayload(
  payload: string,
  _subscription: PushSubscription
): Promise<{ body: Uint8Array; headers: Record<string, string> }> {
  // Placeholder: kembalikan plain text (TIDAK aman untuk produksi)
  // Produksi: implementasi ECDH + AES-128-GCM sesuai RFC 8291
  const encoded = new TextEncoder().encode(payload)
  return {
    body: encoded,
    headers: { 'Content-Type': 'application/octet-stream' },
  }
}

// ── Main Handler ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  if (req.method !== 'POST') {
    return errorResponse('Method tidak diizinkan', 405)
  }

  // ── Autentikasi ────────────────────────────────────────────────────────────────
  let supabase: AuthResult['supabase']
  let user: AuthResult['user']

  try {
    const authResult = await authenticate(req)
    supabase = authResult.supabase
    user = authResult.user
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : ''
    if (msg === 'SUPABASE_CONFIG_MISSING') {
      return errorResponse('Konfigurasi server tidak lengkap', 500)
    }
    return errorResponse('Autentikasi diperlukan', 401)
  }

  // ── Parse request body ──────────────────────────────────────────────────────────
  let body: SendPushRequest
  try {
    body = (await req.json()) as SendPushRequest
  } catch {
    return errorResponse('Request body tidak valid (JSON diperlukan)', 400)
  }

  const { subscription, notification, user_id } = body

  // Validasi subscription
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return errorResponse('Subscription tidak valid: endpoint dan keys diperlukan', 400)
  }

  // Validasi notification
  if (!notification?.title) {
    return errorResponse('Notification title diperlukan', 400)
  }

  // Keamanan: jika user_id diisi, pastikan cocok dengan JWT
  if (user_id && user_id !== user.id) {
    return errorResponse('Akses ditolak: user_id tidak cocok dengan token', 403)
  }

  // ── Verifikasi subscription milik user ini ────────────────────────────────────
  // Cegah user mengirim push ke subscription orang lain
  const { data: prefData } = await supabase
    .from('notification_preferences')
    .select('push_subscription, push_enabled')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!prefData?.push_enabled) {
    return jsonResponse({
      success: false,
      message: 'Push notifications tidak diaktifkan oleh pengguna ini',
      timestamp: new Date().toISOString(),
    } satisfies SendPushResponse)
  }

  const storedEndpoint = (prefData?.push_subscription as PushSubscription | null)?.endpoint
  if (storedEndpoint && storedEndpoint !== subscription.endpoint) {
    return errorResponse('Subscription endpoint tidak cocok dengan yang tersimpan', 403)
  }

  // ── Cek VAPID keys ────────────────────────────────────────────────────────────
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@edusync.app'

  if (!vapidPublicKey || !vapidPrivateKey) {
    // Dev mode: log dan return success palsu
    console.warn('[send-push] VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY belum diset.')
    console.warn(
      '[send-push] SIMULATED push ke endpoint:',
      subscription.endpoint.slice(0, 60) + '...'
    )
    console.warn('[send-push] Notification:', JSON.stringify(notification))

    return jsonResponse({
      success: true,
      message: 'Push disimulasikan (VAPID keys belum dikonfigurasi)',
      timestamp: new Date().toISOString(),
    } satisfies SendPushResponse)
  }

  // ── Build & kirim Web Push request ────────────────────────────────────────────
  try {
    // Payload notifikasi (format sesuai Service Worker Notification API)
    const pushPayload = JSON.stringify({
      title: notification.title,
      body: notification.body ?? '',
      icon: notification.icon ?? '/icon-192x192.png',
      badge: notification.badge ?? '/badge-72x72.png',
      tag: notification.tag ?? 'edusync-notification',
      data: {
        url: notification.url ?? '/',
        ...(notification.data ?? {}),
      },
    })

    // Enkripsi payload (placeholder — ganti dengan RFC 8291 di produksi)
    const { body: encryptedBody, headers: encryptionHeaders } = await encryptPayload(
      pushPayload,
      subscription
    )

    // Ambil audience dari endpoint URL (origin saja)
    const endpointUrl = new URL(subscription.endpoint)
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`

    // Build VAPID Authorization header
    const vapidAuth = await buildVapidAuthHeader(
      audience,
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    )

    // Kirim ke Push Service (FCM, Mozilla Push, dll.)
    const pushResponse = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidAuth,
        TTL: '86400', // 24 jam
        Urgency: 'normal',
        ...encryptionHeaders,
      },
      body: encryptedBody,
    })

    if (pushResponse.status === 410 || pushResponse.status === 404) {
      // Subscription kadaluarsa — hapus dari preferences
      console.warn('[send-push] Subscription kadaluarsa, menghapus dari preferences')
      await supabase
        .from('notification_preferences')
        .update({ push_subscription: null, push_enabled: false })
        .eq('user_id', user.id)

      return jsonResponse({
        success: false,
        message: 'Subscription kadaluarsa dan telah dihapus',
        timestamp: new Date().toISOString(),
      } satisfies SendPushResponse)
    }

    if (!pushResponse.ok) {
      const errText = await pushResponse.text().catch(() => '')
      console.error(`[send-push] Push service error ${pushResponse.status}: ${errText}`)
      throw new Error(`Push service merespons ${pushResponse.status}`)
    }

    return jsonResponse({
      success: true,
      message: 'Push notification berhasil dikirim',
      timestamp: new Date().toISOString(),
    } satisfies SendPushResponse)
  } catch (err) {
    console.error('[send-push] Error saat mengirim push:', err)
    return errorResponse('Gagal mengirim push notification', 500)
  }
})
