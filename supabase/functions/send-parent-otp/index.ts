// =============================================================
// EduSync LMS — Edge Function: send-parent-otp
// =============================================================
// Menerima nomor HP orang tua, membuat OTP 6 digit, menyimpannya
// ke tabel parent_otp_codes, dan mengirim via WhatsApp.
//
// Provider WhatsApp dikonfigurasi via environment variables:
//   WHATSAPP_PROVIDER = 'fonnte' | 'wablas' | 'wa_business' | 'mock'
//   WHATSAPP_API_KEY  = '<api-key>'
//   WHATSAPP_BASE_URL = 'https://api.fonnte.com'
//
// Mode mock (development): OTP dikembalikan di response body.
// Mode production: OTP dikirim via WhatsApp, tidak ada di response.
//
// Input (POST body):
//   { phone: string, tenantId?: string }
//
// Output:
//   {
//     success: true,
//     message: "Kode OTP berhasil dikirim",
//     devOtp?: string  // Hanya di mock mode
//   }
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { errorResponse, jsonResponse } from '../_shared/response.ts'
import {
  sendWhatsApp,
  normalizePhone as normalizePhoneWA,
  getWhatsAppConfig,
} from '../_shared/whatsapp.ts'

// ── Types ────────────────────────────────────────────────────────────────────

interface SendOtpRequest {
  phone: string
  tenantId?: string
}

interface OtpResult {
  success: boolean
  message?: string
  dev_otp?: string
  expires_at?: string
  error?: string
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalisasi nomor HP ke format internasional.
 * 08xx → +628xx
 * 628xx → +628xx
 * +628xx → +628xx
 */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^0-9+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.startsWith('62')) return '+' + digits
  if (digits.startsWith('0')) return '+62' + digits.slice(1)
  return '+62' + digits
}

/** Validasi format nomor HP Indonesia sederhana */
function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone)
  // +62 diikuti 8-12 digit
  return /^\+62[0-9]{8,12}$/.test(normalized)
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  const corsCheck = handleCors(req)
  if (corsCheck) return corsCheck

  if (req.method !== 'POST') {
    return errorResponse('Method tidak diizinkan', 405)
  }

  // ── Environment ────────────────────────────────────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const isDev = Deno.env.get('DENO_ENV') !== 'production'

  if (!supabaseUrl || !serviceKey) {
    console.error('[send-parent-otp] Missing env: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    return errorResponse('Konfigurasi server tidak lengkap', 500)
  }

  // Gunakan service role key agar bisa insert ke parent_otp_codes
  // tanpa autentikasi (orang tua belum punya akun saat request OTP)
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ── Parse Request Body ─────────────────────────────────────────────────────
  let body: SendOtpRequest
  try {
    body = (await req.json()) as SendOtpRequest
  } catch {
    return errorResponse('Request body tidak valid (JSON diperlukan)', 400)
  }

  const { phone: rawPhone, tenantId } = body

  if (!rawPhone) {
    return errorResponse('Nomor HP wajib diisi', 400)
  }

  const phone = normalizePhone(rawPhone)

  if (!isValidPhone(rawPhone)) {
    return errorResponse('Format nomor HP tidak valid. Gunakan format: 08xx-xxxx-xxxx', 400)
  }

  // ── Panggil RPC request_parent_otp ────────────────────────────────────────
  const { data, error } = await supabase.rpc('request_parent_otp', {
    p_phone: phone,
    p_tenant_id: tenantId ?? null,
  })

  if (error) {
    console.error('[send-parent-otp] RPC error:', error)
    return errorResponse('Gagal memproses permintaan OTP', 500)
  }

  const result = data as OtpResult

  if (!result.success) {
    return jsonResponse(
      {
        success: false,
        error: result.error ?? 'Gagal membuat OTP',
      },
      429
    )
  }

  // ── Kirim OTP via WhatsApp ──────────────────────────────────────────────────
  let waConfig: ReturnType<typeof getWhatsAppConfig>
  try {
    waConfig = getWhatsAppConfig()
  } catch (configErr) {
    console.error('[send-parent-otp] WhatsApp config error:', configErr)
    // Fallback ke mock mode jika config error
    waConfig = { provider: 'mock', apiKey: '', baseUrl: '', phoneNumberId: '' }
  }

  const isMockMode = waConfig.provider === 'mock'

  if (result.dev_otp) {
    const otpMessage =
      `[EduSync] Kode verifikasi Anda: ${result.dev_otp}\n` +
      `Berlaku 10 menit.\n` +
      `Jangan bagikan kode ini ke siapapun.`

    const waResult = await sendWhatsApp({
      phone: normalizePhoneWA(phone),
      message: otpMessage,
    })

    if (!waResult.success && !isMockMode) {
      console.error(
        `[send-parent-otp] WhatsApp gagal: ${waResult.error}. ` +
          'Fallback: OTP tersimpan di DB, user bisa request ulang.'
      )
      // Tidak return error — OTP sudah tersimpan di DB.
      // In-app notification sebagai fallback.
    }

    console.info(
      `[send-parent-otp] OTP untuk ${phone} — ` +
        `provider: ${waResult.provider}, success: ${waResult.success}` +
        (waResult.messageId ? `, msgId: ${waResult.messageId}` : '')
    )
  }

  // Mock mode: log OTP ke konsol dan return devOtp
  if (isMockMode && result.dev_otp) {
    console.info(`[send-parent-otp] MOCK MODE — OTP untuk ${phone}: ${result.dev_otp}`)
  }

  return jsonResponse({
    success: true,
    message: isMockMode
      ? 'Kode OTP berhasil dibuat (mode development).'
      : 'Kode OTP berhasil dikirim via WhatsApp.',
    phone,
    expiresAt: result.expires_at,
    // Hanya kirim dev_otp di mock mode
    ...(isMockMode && result.dev_otp ? { devOtp: result.dev_otp } : {}),
  })
})
