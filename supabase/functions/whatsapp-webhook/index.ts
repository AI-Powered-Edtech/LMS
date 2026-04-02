// =============================================================
// EduSync LMS — Edge Function: whatsapp-webhook
// =============================================================
// Endpoint untuk menerima delivery reports dan status updates
// dari WhatsApp API provider (Fonnte, Wablas, WhatsApp Business API).
//
// Digunakan untuk tracking:
//   - sent     : pesan terkirim ke server
//   - delivered: pesan sampai ke device penerima
//   - read     : pesan dibaca oleh penerima
//   - failed   : pesan gagal dikirim
//
// Provider mengirim webhook ke:
//   POST /functions/v1/whatsapp-webhook?provider=fonnte
//   POST /functions/v1/whatsapp-webhook?provider=wablas
//   POST /functions/v1/whatsapp-webhook?provider=wa_business
//
// Security:
//   - Verifikasi webhook secret/token jika tersedia
//   - WhatsApp Business API: verifikasi hub.verify_token untuk setup
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { corsHeaders } from '../_shared/cors.ts'

// ── Types ────────────────────────────────────────────────────────────────────

interface DeliveryReport {
  messageId: string
  phone: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: string
  provider: string
  rawPayload?: unknown
}

// ── Webhook Verification (WhatsApp Business API) ─────────────────────────────

function handleWaBusinessVerification(req: Request): Response | null {
  const url = new URL(req.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token && challenge) {
    const webhookSecret = Deno.env.get('WHATSAPP_WEBHOOK_SECRET') ?? ''
    if (token === webhookSecret) {
      console.info('[whatsapp-webhook] Verifikasi webhook berhasil')
      return new Response(challenge, { status: 200 })
    }
    console.warn('[whatsapp-webhook] Verifikasi webhook gagal: token tidak cocok')
    return new Response('Forbidden', { status: 403 })
  }

  return null
}

// ── Parse Provider Payloads ──────────────────────────────────────────────────

function parseFonnteWebhook(body: Record<string, unknown>): DeliveryReport | null {
  // Fonnte mengirim delivery report dengan format:
  // { id, phone, status, message }
  const id = body.id as string | undefined
  const phone = body.phone as string | undefined
  const status = body.status as string | undefined

  if (!id || !phone || !status) return null

  const statusMap: Record<string, DeliveryReport['status']> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
    pending: 'sent',
  }

  return {
    messageId: String(id),
    phone,
    status: statusMap[status.toLowerCase()] ?? 'sent',
    timestamp: new Date().toISOString(),
    provider: 'fonnte',
    rawPayload: body,
  }
}

function parseWablasWebhook(body: Record<string, unknown>): DeliveryReport | null {
  // Wablas delivery report format:
  // { id, phone, message, status, ... }
  const id = body.id as string | undefined
  const phone = body.phone as string | undefined
  const status = body.status as string | undefined

  if (!id || !phone || !status) return null

  const statusMap: Record<string, DeliveryReport['status']> = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
    pending: 'sent',
  }

  return {
    messageId: String(id),
    phone,
    status: statusMap[status.toLowerCase()] ?? 'sent',
    timestamp: new Date().toISOString(),
    provider: 'wablas',
    rawPayload: body,
  }
}

function parseWaBusinessWebhook(body: Record<string, unknown>): DeliveryReport | null {
  // WhatsApp Business API webhook format (simplified):
  // { entry: [{ changes: [{ value: { statuses: [{ id, recipient_id, status, timestamp }] } }] }] }
  try {
    const entries = body.entry as Array<Record<string, unknown>> | undefined
    if (!entries?.length) return null

    const changes = entries[0].changes as Array<Record<string, unknown>> | undefined
    if (!changes?.length) return null

    const value = changes[0].value as Record<string, unknown> | undefined
    const statuses = value?.statuses as Array<Record<string, unknown>> | undefined
    if (!statuses?.length) return null

    const statusEntry = statuses[0]
    const id = statusEntry.id as string
    const recipientId = statusEntry.recipient_id as string
    const status = statusEntry.status as string
    const timestamp = statusEntry.timestamp as string

    const statusMap: Record<string, DeliveryReport['status']> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
    }

    return {
      messageId: id,
      phone: recipientId,
      status: statusMap[status] ?? 'sent',
      timestamp: timestamp
        ? new Date(Number(timestamp) * 1000).toISOString()
        : new Date().toISOString(),
      provider: 'wa_business',
      rawPayload: body,
    }
  } catch {
    return null
  }
}

// ── Main Handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const url = new URL(req.url)
  const provider = url.searchParams.get('provider') ?? 'unknown'

  // GET: WhatsApp Business API webhook verification
  if (req.method === 'GET') {
    const verification = handleWaBusinessVerification(req)
    if (verification) return verification
    return new Response('OK', { status: 200 })
  }

  // Hanya terima POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method tidak diizinkan' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // ── Parse body ──────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = (await req.json()) as Record<string, unknown>
  } catch {
    return new Response(JSON.stringify({ error: 'Body tidak valid' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // ── Parse delivery report berdasarkan provider ─────────────────────
  let report: DeliveryReport | null = null

  switch (provider) {
    case 'fonnte':
      report = parseFonnteWebhook(body)
      break
    case 'wablas':
      report = parseWablasWebhook(body)
      break
    case 'wa_business':
      report = parseWaBusinessWebhook(body)
      break
    default:
      console.warn(`[whatsapp-webhook] Provider tidak dikenal: ${provider}`)
      return new Response(JSON.stringify({ error: `Provider "${provider}" tidak didukung` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
  }

  if (!report) {
    console.warn(
      `[whatsapp-webhook] Gagal parse webhook dari ${provider}:`,
      JSON.stringify(body).slice(0, 500)
    )
    // Tetap return 200 agar provider tidak retry terus
    return new Response(JSON.stringify({ received: true, parsed: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // ── Log delivery report ─────────────────────────────────────────────
  console.info(
    `[whatsapp-webhook] ${report.provider} | ` +
      `msgId: ${report.messageId} | ` +
      `phone: ${report.phone} | ` +
      `status: ${report.status} | ` +
      `time: ${report.timestamp}`
  )

  // ── Simpan ke activity_events (opsional) ────────────────────────────
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (supabaseUrl && serviceKey) {
    try {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      })

      await supabase.from('activity_events').insert({
        event_type: 'whatsapp_delivery_report',
        metadata: {
          message_id: report.messageId,
          phone: report.phone,
          status: report.status,
          provider: report.provider,
          timestamp: report.timestamp,
        },
      })
    } catch (dbErr) {
      // Tidak fatal — log saja, jangan gagalkan webhook
      console.error('[whatsapp-webhook] Gagal simpan ke activity_events:', dbErr)
    }
  }

  return new Response(
    JSON.stringify({
      received: true,
      messageId: report.messageId,
      status: report.status,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    }
  )
})
