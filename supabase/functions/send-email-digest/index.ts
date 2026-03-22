// =============================================================
// EduSync LMS — Edge Function: send-email-digest
// =============================================================
// Mengirim ringkasan email notifikasi yang belum dibaca dalam 24 jam
// terakhir kepada setiap pengguna yang mengaktifkan email_enabled.
//
// Pemanggilan:
//   - Via Supabase cron schedule (pg_cron atau Supabase Scheduled Functions)
//   - Via service role HTTP call dari pipeline background
//
// Produksi: integrasikan Resend atau SendGrid dengan mengganti blok
// TODO di bawah. SMTP_FROM dan provider API key disimpan di
// Supabase Secrets (bukan di kode).
//
// Email digest: email_sent flag ditambahkan ke tabel notifications
// di migration 003 sehingga digest tidak mengirim ulang notifikasi
// yang sudah pernah dimasukkan ke digest sebelumnya.
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

// ── Types ─────────────────────────────────────────────────────────────────

interface NotificationRow {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface UserDigest {
  user_id: string
  email: string
  notifications: NotificationRow[]
}

interface DigestResult {
  sent: number
  skipped: number
  errors: number
  timestamp: string
}

// ── CORS Headers ──────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Tipe notifikasi ke label Bahasa Indonesia ─────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  grade_posted: 'Nilai Baru',
  assignment_due: 'Tenggat Tugas',
  quiz_available: 'Kuis Tersedia',
  announcement: 'Pengumuman',
  course_enrolled: 'Pendaftaran Kursus',
  badge_earned: 'Lencana Baru',
  discussion_reply: 'Balasan Diskusi',
  system: 'Informasi Sistem',
}

// ── Template HTML Email Digest ────────────────────────────────────────────

function buildEmailHtml(notifications: NotificationRow[], userEmail: string): string {
  const grouped: Record<string, NotificationRow[]> = {}
  for (const n of notifications) {
    const label = TYPE_LABELS[n.type] ?? n.type
    if (!grouped[label]) grouped[label] = []
    grouped[label].push(n)
  }

  const sections = Object.entries(grouped)
    .map(([label, items]) => {
      const rows = items
        .map(
          (n) => `
        <tr>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;">
            <strong style="color:#1e3a5f;">${escapeHtml(n.title)}</strong>
            ${n.body ? `<br><span style="color:#555;font-size:13px;">${escapeHtml(n.body)}</span>` : ''}
          </td>
          <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;color:#888;font-size:12px;white-space:nowrap;">
            ${new Date(n.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
          </td>
        </tr>`
        )
        .join('')

      return `
      <tr>
        <td colspan="2" style="padding:16px 12px 4px;background:#f7f9fc;">
          <strong style="color:#2563eb;font-size:13px;text-transform:uppercase;letter-spacing:0.5px;">
            ${escapeHtml(label)} (${items.length})
          </strong>
        </td>
      </tr>
      ${rows}`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Ringkasan Notifikasi EduSync</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4f8;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0"
               style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td colspan="2" style="background:#2563eb;padding:24px 32px;">
              <h1 style="margin:0;color:#fff;font-size:22px;">EduSync</h1>
              <p style="margin:4px 0 0;color:#bfdbfe;font-size:14px;">
                Ringkasan notifikasi 24 jam terakhir
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td colspan="2" style="padding:20px 24px 8px;">
              <p style="margin:0;color:#333;font-size:14px;">
                Anda memiliki <strong>${notifications.length} notifikasi</strong> yang belum dibaca.
              </p>
            </td>
          </tr>

          <!-- Notifications table -->
          <tr>
            <td colspan="2" style="padding:8px 12px 0;">
              <table width="100%" cellpadding="0" cellspacing="0"
                     style="border-collapse:collapse;font-size:14px;">
                ${sections}
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td colspan="2" style="padding:24px;text-align:center;">
              <a href="${Deno.env.get('APP_URL') ?? 'https://edusync.app'}/#/app/student/notifications"
                 style="display:inline-block;padding:12px 28px;background:#2563eb;color:#fff;
                        border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;">
                Lihat Semua Notifikasi
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td colspan="2" style="padding:16px 24px;background:#f7f9fc;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;">
                Email ini dikirim ke ${escapeHtml(userEmail)}.<br>
                Anda dapat menonaktifkan email notifikasi di pengaturan akun.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Main Handler ──────────────────────────────────────────────────────────

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Konfigurasi server tidak lengkap' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  // Keamanan: hanya service role atau cron yang boleh memanggil fungsi ini
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Tidak diizinkan: diperlukan service role' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  const result: DigestResult = {
    sent: 0,
    skipped: 0,
    errors: 0,
    timestamp: new Date().toISOString(),
  }

  try {
    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Ambil semua notifikasi belum dibaca dan belum terkirim email dalam 24 jam
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, body, metadata, created_at')
      .eq('is_read', false)
      .eq('email_sent', false)
      .gte('created_at', windowStart)
      .order('created_at', { ascending: false })

    if (notifError) throw notifError
    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ ...result, message: 'Tidak ada notifikasi baru' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Kelompokkan per user
    const byUser = new Map<string, NotificationRow[]>()
    for (const n of notifications as NotificationRow[]) {
      const existing = byUser.get(n.user_id) ?? []
      existing.push(n)
      byUser.set(n.user_id, existing)
    }

    // Proses setiap user
    for (const [userId, userNotifs] of byUser) {
      try {
        // Cek preferensi email user
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('email_enabled, disabled_types')
          .eq('user_id', userId)
          .maybeSingle()

        // Skip jika email dinonaktifkan
        if (prefs && prefs.email_enabled === false) {
          result.skipped += userNotifs.length
          continue
        }

        // Filter notifikasi berdasarkan disabled_types
        const disabledTypes: string[] = prefs?.disabled_types ?? []
        const filteredNotifs = userNotifs.filter((n) => !disabledTypes.includes(n.type))

        if (filteredNotifs.length === 0) {
          result.skipped += userNotifs.length
          continue
        }

        // Ambil email user dari auth.users (butuh service role)
        const { data: userData } = await supabase.auth.admin.getUserById(userId)
        const userEmail = userData?.user?.email

        if (!userEmail) {
          result.skipped += filteredNotifs.length
          continue
        }

        // Build email HTML
        const html = buildEmailHtml(filteredNotifs, userEmail)
        const subject = `EduSync: ${filteredNotifs.length} notifikasi belum dibaca`

        // TODO (produksi): Kirim via Resend atau SendGrid
        // const { error: sendError } = await resend.emails.send({
        //   from: Deno.env.get('SMTP_FROM') ?? 'noreply@edusync.app',
        //   to: userEmail,
        //   subject,
        //   html,
        // })
        // if (sendError) throw sendError

        // Log ke console untuk dev (hapus di produksi)
        console.log(
          `[send-email-digest] SIMULATED: kirim ke ${userEmail}, ${filteredNotifs.length} notifikasi`
        )
        console.log(`[send-email-digest] Subject: ${subject}`)
        console.log(`[send-email-digest] HTML length: ${html.length} chars`)

        // Tandai notifikasi sebagai sudah di-email
        const notifIds = filteredNotifs.map((n) => n.id)
        await supabase.from('notifications').update({ email_sent: true }).in('id', notifIds)

        result.sent += filteredNotifs.length
      } catch (userErr) {
        console.error(`[send-email-digest] Error untuk user ${userId}:`, userErr)
        result.errors++
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('[send-email-digest] Fatal error:', err)
    return new Response(
      JSON.stringify({
        error: 'Terjadi kesalahan server',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    )
  }
})
