// =============================================================
// EduSync LMS — Edge Function: send-parent-digest
// Wave 4 — Task 29.4: Daily Digest Notification
// =============================================================
// Dipanggil oleh pg_cron setiap hari jam 17:00 WIB (10:00 UTC)
// atau oleh admin/trigger manual.
//
// Process:
//   1. Fetch semua parent yang digest_enabled = true
//   2. Untuk setiap parent: fetch child data (grades, attendance, assignments)
//   3. Generate digest message
//   4. Simpan ke notifications table sebagai in-app notification
//   5. Kirim via WhatsApp jika channel = 'whatsapp'
//   6. Kirim via email jika channel = 'email' (placeholder)
// =============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { sendWhatsApp, normalizePhone } from '../_shared/whatsapp.ts'

// ── Types ─────────────────────────────────────────────────────────────────

interface DigestSetting {
  id: string
  parent_id: string
  tenant_id: string
  channel: 'inapp' | 'whatsapp' | 'email'
  last_sent_at: string | null
}

interface DigestResult {
  processed: number
  skipped: number
  errors: number
  timestamp: string
}

// ── CORS Headers ──────────────────────────────────────────────────────────

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('CORS_ORIGIN') ?? 'https://lms.edusync.dev',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Helper: Format tanggal Indonesia ──────────────────────────────────────

function formatDateIndonesia(date: Date): string {
  return date.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta',
  })
}

// ── Generate Digest Message ────────────────────────────────────────────────

interface DigestData {
  lessonsCompleted: number
  assignmentsSubmitted: number
  overdueAssignments: number
  attendanceStatus: 'hadir' | 'absen' | 'tidak_ada_data'
}

function generateDigestBody(childName: string, data: DigestData): string {
  const lines: string[] = []

  // Kehadiran hari ini
  if (data.attendanceStatus === 'hadir') {
    lines.push('✅ Hadir di sekolah hari ini')
  } else if (data.attendanceStatus === 'absen') {
    lines.push('⚠️ Tidak hadir hari ini')
  }

  // Pelajaran diselesaikan
  if (data.lessonsCompleted > 0) {
    lines.push(`📚 ${data.lessonsCompleted} pelajaran selesai hari ini`)
  }

  // Tugas dikumpulkan
  if (data.assignmentsSubmitted > 0) {
    lines.push(`📝 ${data.assignmentsSubmitted} tugas dikumpulkan`)
  }

  // Tugas hampir tenggat
  if (data.overdueAssignments > 0) {
    lines.push(`⚠️ ${data.overdueAssignments} tugas hampir tenggat waktu`)
  }

  // Jika tidak ada aktivitas
  if (lines.length === 0) {
    lines.push('📊 Tidak ada aktivitas baru hari ini')
  }

  return lines.join('\n')
}

// ── Fetch Child Activity Data ──────────────────────────────────────────────

async function fetchChildActivity(
  supabase: ReturnType<typeof createClient>,
  studentId: string,
  tenantId: string,
  dateStr: string
): Promise<DigestData> {
  const dayStart = `${dateStr}T00:00:00+07:00`
  const dayEnd = `${dateStr}T23:59:59+07:00`

  // Pelajaran diselesaikan hari ini
  const { count: lessonsCompleted } = await supabase
    .from('lesson_progress')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .eq('is_completed', true)
    .gte('completed_at', dayStart)
    .lte('completed_at', dayEnd)

  // Tugas dikumpulkan hari ini
  const { count: assignmentsSubmitted } = await supabase
    .from('assignment_submissions')
    .select('id', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)
    .in('status', ['submitted', 'graded'])
    .gte('submitted_at', dayStart)
    .lte('submitted_at', dayEnd)

  // Tugas hampir tenggat (dalam 3 hari ke depan, belum dikumpulkan)
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  const { count: overdueAssignments } = await supabase
    .from('assignments')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('is_published', true)
    .lte('due_date', threeDaysLater.toISOString())
    .gte('due_date', new Date().toISOString())

  // Kehadiran hari ini
  const { data: attendance } = await supabase
    .from('attendance_records')
    .select('status')
    .eq('student_id', studentId)
    .eq('date', dateStr)
    .maybeSingle()

  let attendanceStatus: DigestData['attendanceStatus'] = 'tidak_ada_data'
  if (attendance) {
    const s = (attendance.status as string).toLowerCase()
    attendanceStatus = s === 'hadir' || s === 'present' ? 'hadir' : 'absen'
  }

  return {
    lessonsCompleted: lessonsCompleted ?? 0,
    assignmentsSubmitted: assignmentsSubmitted ?? 0,
    overdueAssignments: overdueAssignments ?? 0,
    attendanceStatus,
  }
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

  // Keamanan: hanya service role atau cron yang boleh memanggil
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
    processed: 0,
    skipped: 0,
    errors: 0,
    timestamp: new Date().toISOString(),
  }

  try {
    // Tanggal hari ini dalam WIB
    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000)
    const todayStr = nowWIB.toISOString().split('T')[0]
    const dateLabel = formatDateIndonesia(new Date())

    // Cek apakah ada parent_id dari body (manual trigger untuk satu parent)
    let targetParentId: string | null = null
    if (req.method === 'POST') {
      try {
        const body = await req.json()
        targetParentId = body?.parent_id ?? null
      } catch {
        // Body kosong, jalankan semua
      }
    }

    // Fetch semua parent yang digest_enabled = true
    let query = supabase
      .from('parent_digest_settings')
      .select('id, parent_id, tenant_id, channel, last_sent_at')
      .eq('digest_enabled', true)

    if (targetParentId) {
      query = query.eq('parent_id', targetParentId)
    } else {
      // Hanya yang belum terkirim hari ini
      const todayStart = `${todayStr}T00:00:00.000Z`
      query = query.or(`last_sent_at.is.null,last_sent_at.lt.${todayStart}`)
    }

    const { data: digestSettings, error: settingsError } = await query

    if (settingsError) throw settingsError
    if (!digestSettings || digestSettings.length === 0) {
      return new Response(
        JSON.stringify({ ...result, message: 'Tidak ada parent yang perlu digest hari ini' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      )
    }

    // Proses setiap parent
    for (const setting of digestSettings as DigestSetting[]) {
      try {
        // Fetch anak-anak dari parent ini
        const { data: children } = await supabase
          .from('student_parent_links')
          .select('student_id, profiles!student_id(full_name)')
          .eq('parent_id', setting.parent_id)
          .eq('tenant_id', setting.tenant_id)

        if (!children || children.length === 0) {
          result.skipped++
          continue
        }

        // Generate digest untuk setiap anak
        const notificationParts: string[] = []

        for (const link of children as Record<string, unknown>[]) {
          const studentId = link.student_id as string
          const profileData = link.profiles as { full_name: string } | null
          const childName = profileData?.full_name?.split(' ')[0] ?? 'Anak'

          const activityData = await fetchChildActivity(
            supabase,
            studentId,
            setting.tenant_id,
            todayStr
          )

          const digestBody = generateDigestBody(childName, activityData)
          notificationParts.push(`Laporan ${childName}:\n${digestBody}`)
        }

        if (notificationParts.length === 0) {
          result.skipped++
          continue
        }

        const fullBody = notificationParts.join('\n\n')
        const title = `Laporan Harian Anak — ${dateLabel}`

        // Simpan sebagai in-app notification
        const { error: notifError } = await supabase.from('notifications').insert({
          tenant_id: setting.tenant_id,
          user_id: setting.parent_id,
          type: 'parent_daily_digest',
          title,
          body: fullBody,
          metadata: {
            date: todayStr,
            channel: setting.channel,
            digest_setting_id: setting.id,
          },
        })

        if (notifError) {
          console.error(
            `[send-parent-digest] Gagal menyimpan notifikasi untuk ${setting.parent_id}:`,
            notifError
          )
          result.errors++
          continue
        }

        // ── Kirim via WhatsApp jika channel === 'whatsapp' ──────────
        if (setting.channel === 'whatsapp') {
          // Fetch nomor HP parent dari profiles
          const { data: parentProfile } = await supabase
            .from('profiles')
            .select('phone')
            .eq('id', setting.parent_id)
            .maybeSingle()

          const parentPhone = parentProfile?.phone as string | null

          if (parentPhone) {
            const waMessage = `📊 ${title}\n\n${fullBody}\n\n` + `— EduSync LMS`

            const waResult = await sendWhatsApp({
              phone: normalizePhone(parentPhone),
              message: waMessage,
            })

            if (!waResult.success) {
              console.warn(
                `[send-parent-digest] WhatsApp gagal untuk ${setting.parent_id}: ${waResult.error}. ` +
                  'Fallback: notifikasi in-app sudah tersimpan.'
              )
            } else {
              console.info(
                `[send-parent-digest] WhatsApp berhasil untuk ${setting.parent_id} ` +
                  `via ${waResult.provider}` +
                  (waResult.messageId ? ` (id: ${waResult.messageId})` : '')
              )
            }
          } else {
            console.warn(
              `[send-parent-digest] Nomor HP tidak ditemukan untuk parent ${setting.parent_id}. ` +
                'Fallback: notifikasi in-app saja.'
            )
          }
        }

        // ── Kirim via Email jika channel === 'email' ─────────────────
        if (setting.channel === 'email') {
          // TODO: Integrasikan dengan email service (Resend/SendGrid)
          // Untuk saat ini, in-app notification sudah tersimpan di atas.
          console.info(
            `[send-parent-digest] Email digest untuk ${setting.parent_id} — ` +
              'fitur email belum aktif, menggunakan in-app notification.'
          )
        }

        // channel === 'inapp' sudah ditangani oleh insert ke notifications di atas

        // Update last_sent_at
        await supabase
          .from('parent_digest_settings')
          .update({ last_sent_at: new Date().toISOString() })
          .eq('id', setting.id)

        console.log(
          `[send-parent-digest] Digest dikirim ke parent ${setting.parent_id} ` +
            `(channel: ${setting.channel})`
        )
        result.processed++
      } catch (parentErr) {
        console.error(`[send-parent-digest] Error untuk parent ${setting.parent_id}:`, parentErr)
        result.errors++
      }
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err) {
    console.error('[send-parent-digest] Fatal error:', err)
    return new Response(JSON.stringify({ error: 'Terjadi kesalahan server' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
