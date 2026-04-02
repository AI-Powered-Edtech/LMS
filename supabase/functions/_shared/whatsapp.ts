// =============================================================
// EduSync LMS — Shared: WhatsApp Service Abstraction
// =============================================================
// Abstraksi multi-provider WhatsApp API untuk pengiriman OTP,
// digest, dan notifikasi lainnya.
//
// Provider yang didukung:
//   - fonnte  : https://fonnte.com (provider Indonesia)
//   - wablas  : https://wablas.com (provider Indonesia)
//   - wa_business : WhatsApp Business API (Meta/Facebook)
//   - mock    : mode development — log ke console, tidak kirim
//
// Konfigurasi via environment variables:
//   WHATSAPP_PROVIDER  = 'fonnte' | 'wablas' | 'wa_business' | 'mock'
//   WHATSAPP_API_KEY   = '<api-key-dari-provider>'
//   WHATSAPP_BASE_URL  = 'https://api.fonnte.com' (opsional, ada default)
//   WHATSAPP_PHONE_NUMBER_ID = '<phone-number-id>' (khusus wa_business)
// =============================================================

// ── Types ────────────────────────────────────────────────────────────────────

export type WhatsAppProvider = 'fonnte' | 'wablas' | 'wa_business' | 'mock'

export interface WhatsAppConfig {
  provider: WhatsAppProvider
  apiKey: string
  baseUrl: string
  phoneNumberId?: string // khusus wa_business
}

export interface SendMessageParams {
  phone: string // format: 628xxxxxxxxxx (tanpa +)
  message: string
  type?: 'text' | 'template'
}

export interface SendMessageResult {
  success: boolean
  messageId?: string
  provider: WhatsAppProvider
  error?: string
}

// ── Default Base URLs per Provider ───────────────────────────────────────────

const DEFAULT_BASE_URLS: Record<WhatsAppProvider, string> = {
  fonnte: 'https://api.fonnte.com',
  wablas: 'https://pati.wablas.com',
  wa_business: 'https://graph.facebook.com/v18.0',
  mock: '',
}

// ── normalizePhone ──────────────────────────────────────────────────────────
/**
 * Normalisasi nomor HP ke format 628xxxxxxxxxx (tanpa +).
 *
 * Input yang didukung:
 *   08xx...    → 628xx...
 *   +628xx...  → 628xx...
 *   628xx...   → 628xx...
 *   8xx...     → 628xx...
 *
 * Strip spasi, dash, dan karakter non-digit.
 */
export function normalizePhone(phone: string): string {
  // Hapus semua karakter kecuali digit
  const digits = phone.replace(/[^0-9]/g, '')

  if (digits.startsWith('62')) return digits
  if (digits.startsWith('0')) return '62' + digits.slice(1)
  if (digits.startsWith('8')) return '62' + digits

  // Fallback: tambah prefix 62 jika belum ada
  return '62' + digits
}

// ── getWhatsAppConfig ────────────────────────────────────────────────────────
/**
 * Baca konfigurasi WhatsApp dari environment variables.
 * Throw error jika provider bukan 'mock' dan API key tidak ada.
 */
export function getWhatsAppConfig(): WhatsAppConfig {
  const provider = (Deno.env.get('WHATSAPP_PROVIDER') ?? 'mock') as WhatsAppProvider
  const apiKey = Deno.env.get('WHATSAPP_API_KEY') ?? ''
  const baseUrl = Deno.env.get('WHATSAPP_BASE_URL') ?? DEFAULT_BASE_URLS[provider] ?? ''
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''

  // Validasi: provider non-mock harus punya API key
  if (provider !== 'mock' && !apiKey) {
    throw new Error(
      `[whatsapp] WHATSAPP_API_KEY wajib diisi untuk provider "${provider}". ` +
        'Set ke WHATSAPP_PROVIDER=mock untuk mode development.'
    )
  }

  // Validasi khusus wa_business
  if (provider === 'wa_business' && !phoneNumberId) {
    throw new Error('[whatsapp] WHATSAPP_PHONE_NUMBER_ID wajib diisi untuk provider "wa_business".')
  }

  return { provider, apiKey, baseUrl, phoneNumberId }
}

// ── Provider Implementations ─────────────────────────────────────────────────

/** Fonnte: POST https://api.fonnte.com/send */
async function sendViaFonnte(
  config: WhatsAppConfig,
  params: SendMessageParams
): Promise<SendMessageResult> {
  const url = `${config.baseUrl}/send`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: config.apiKey,
    },
    body: new URLSearchParams({
      target: params.phone,
      message: params.message,
      countryCode: '62',
    }),
  })

  const body = await res.json()

  if (!res.ok || body.status === false) {
    return {
      success: false,
      provider: 'fonnte',
      error: body.reason ?? body.message ?? `HTTP ${res.status}`,
    }
  }

  return {
    success: true,
    provider: 'fonnte',
    messageId: body.id?.toString() ?? undefined,
  }
}

/** Wablas: POST https://pati.wablas.com/api/send-message */
async function sendViaWablas(
  config: WhatsAppConfig,
  params: SendMessageParams
): Promise<SendMessageResult> {
  const url = `${config.baseUrl}/api/send-message`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: config.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: params.phone,
      message: params.message,
    }),
  })

  const body = await res.json()

  if (!res.ok || body.status === false) {
    return {
      success: false,
      provider: 'wablas',
      error: body.message ?? `HTTP ${res.status}`,
    }
  }

  return {
    success: true,
    provider: 'wablas',
    messageId: body.data?.id ?? undefined,
  }
}

/** WhatsApp Business API (Meta): POST /v18.0/{phone_number_id}/messages */
async function sendViaWaBusiness(
  config: WhatsAppConfig,
  params: SendMessageParams
): Promise<SendMessageResult> {
  const url = `${config.baseUrl}/${config.phoneNumberId}/messages`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: params.phone,
      type: 'text',
      text: { body: params.message },
    }),
  })

  const body = await res.json()

  if (!res.ok || body.error) {
    return {
      success: false,
      provider: 'wa_business',
      error: body.error?.message ?? `HTTP ${res.status}`,
    }
  }

  return {
    success: true,
    provider: 'wa_business',
    messageId: body.messages?.[0]?.id ?? undefined,
  }
}

/** Mock: log ke console, selalu return success */
function sendViaMock(params: SendMessageParams): SendMessageResult {
  console.info(`[whatsapp:mock] Pesan ke ${params.phone}:\n` + `---\n${params.message}\n---`)
  return {
    success: true,
    provider: 'mock',
    messageId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  }
}

// ── sendWhatsApp (entry point) ──────────────────────────────────────────────
/**
 * Kirim pesan WhatsApp via provider yang dikonfigurasi.
 *
 * Fitur:
 *   - Auto-normalize nomor HP
 *   - 1x retry otomatis jika gagal (delay 5 detik)
 *   - Logging setiap attempt
 *
 * @example
 *   const result = await sendWhatsApp({
 *     phone: '081234567890',
 *     message: 'Kode OTP Anda: 123456',
 *   })
 */
export async function sendWhatsApp(params: SendMessageParams): Promise<SendMessageResult> {
  const config = getWhatsAppConfig()

  // Normalize nomor HP
  const normalizedParams: SendMessageParams = {
    ...params,
    phone: normalizePhone(params.phone),
  }

  console.info(`[whatsapp] Mengirim pesan via ${config.provider} ke ${normalizedParams.phone}`)

  // Attempt 1
  let result = await dispatchSend(config, normalizedParams)

  // Retry 1x jika gagal (bukan mock)
  if (!result.success && config.provider !== 'mock') {
    console.warn(`[whatsapp] Attempt 1 gagal: ${result.error}. Retry dalam 5 detik...`)
    await delay(5000)

    console.info(`[whatsapp] Retry attempt 2 ke ${normalizedParams.phone}`)
    result = await dispatchSend(config, normalizedParams)

    if (!result.success) {
      console.error(`[whatsapp] Attempt 2 gagal: ${result.error}. Tidak ada retry lagi.`)
    }
  }

  // Log result
  if (result.success) {
    console.info(
      `[whatsapp] Berhasil dikirim via ${result.provider}` +
        (result.messageId ? ` (id: ${result.messageId})` : '')
    )
  } else {
    console.error(`[whatsapp] Gagal mengirim: ${result.error}`)
  }

  return result
}

// ── Internal Helpers ─────────────────────────────────────────────────────────

/** Dispatch ke implementasi provider yang sesuai */
async function dispatchSend(
  config: WhatsAppConfig,
  params: SendMessageParams
): Promise<SendMessageResult> {
  try {
    switch (config.provider) {
      case 'fonnte':
        return await sendViaFonnte(config, params)
      case 'wablas':
        return await sendViaWablas(config, params)
      case 'wa_business':
        return await sendViaWaBusiness(config, params)
      case 'mock':
        return sendViaMock(params)
      default:
        return {
          success: false,
          provider: config.provider,
          error: `Provider "${config.provider}" tidak dikenal`,
        }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      success: false,
      provider: config.provider,
      error: `Exception: ${message}`,
    }
  }
}

/** Delay helper */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
