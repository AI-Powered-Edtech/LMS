// =============================================================
// EduSync LMS — Edge Function: send-parent-digest
// Wave 4 — Task 29.4: Daily Digest Notification
// =============================================================
// Dipanggil oleh pg_cron setiap hari jam 17:00 WIB (10:00 UTC)
// atau oleh admin/trigger manual.
//
// Process:
//   1. Fetch semua parent yang digest_enabled = true
//   2. Batch-fetch semua parent-child links sekaligus
//   3. Batch-fetch semua activity data untuk semua siswa sekaligus
//   4. Build lookup maps di memori, proses per-parent tanpa query tambahan
//   5. Generate digest message
//   6. Simpan ke notifications table sebagai in-app notification
//   7. Kirim via WhatsApp jika channel = 'whatsapp'
//   8. Kirim via email jika channel = 'email' (placeholder)
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

// ── Batch Activity Data Maps ───────────────────────────────────────────────

interface BatchActivityMaps {
  // student_id → count of lessons completed today
  lessonsByStudent: Map<string, number>
  // student_id → count of assignments submitted today
  submissionsByStudent: Map<string, number>
  // enrollment_id → attendance status string
  attendanceByEnrollment: Map<string, string>
  // student_id → list of enrollment IDs
  enrollmentsByStudent: Map<string, string[]>
  // tenant_id → count of overdue assignments (shared across all students in tenant)
  overdueByTenant: Map<string, number>
}

async function fetchBatchActivityData(
  supabase: ReturnType<typeof createClient>,
  studentIds: string[],
  tenantIds: string[],
  dateStr: string
): Promise<BatchActivityMaps> {
  const dayStart = `${dateStr}T00:00:00+07:00`
  const dayEnd = `${dateStr}T23:59:59+07:00`
  const threeDaysLater = new Date()
  threeDaysLater.setDate(threeDaysLater.getDate() + 3)

  // Run all batch queries in parallel
  const [lessonsResult, submissionsResult, enrollmentsResult, overdueResults] = await Promise.all([
    // Batch: lessons completed today for all students
    supabase
      .from('lesson_progress')
      .select('user_id')
      .in('user_id', studentIds)
      .in('tenant_id', tenantIds)
      .eq('completed', true)
      .gte('completed_at', dayStart)
      .lte('completed_at', dayEnd)
      .limit(5000),

    // Batch: assignment submissions today for all students
    supabase
      .from('assignment_submissions')
      .select('student_id')
      .in('student_id', studentIds)
      .in('tenant_id', tenantIds)
      .in('status', ['submitted', 'graded'])
      .gte('submitted_at', dayStart)
      .lte('submitted_at', dayEnd)
      .limit(5000),

    // Batch: enrollments for all students (needed for attendance lookup)
    supabase
      .from('enrollments')
      .select('id, student_id, tenant_id')
      .in('student_id', studentIds)
      .in('tenant_id', tenantIds)
      .limit(10000),

    // Batch: overdue assignments per tenant (one query per unique tenant)
    Promise.all(
      tenantIds.map(async (tenantId) => {
        const { count } = await supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('is_published', true)
          .lte('due_date', threeDaysLater.toISOString())
          .gte('due_date', new Date().toISOString())
        return { tenantId, count: count ?? 0 }
      })
    ),
  ])

  // Build enrollment lookup maps
  const enrollmentsByStudent = new Map<string, string[]>()
  const allEnrollmentIds: string[] = []

  for (const enr of enrollmentsResult.data ?? []) {
    const list = enrollmentsByStudent.get(enr.student_id) ?? []
    list.push(enr.id)
    enrollmentsByStudent.set(enr.student_id, list)
    allEnrollmentIds.push(enr.id)
  }

  // Batch: attendance for all enrollment IDs at once
  let attendanceByEnrollment = new Map<string, string>()
  if (allEnrollmentIds.length > 0) {
    const { data: attendanceRows } = await supabase
      .from('attendance_records')
      .select('enrollment_id, status')
      .in('enrollment_id', allEnrollmentIds)
      .eq('date', dateStr)
      .limit(10000)

    for (const row of attendanceRows ?? []) {
      // Keep first record per enrollment (matches original .maybeSingle() behaviour)
      if (!attendanceByEnrollment.has(row.enrollment_id)) {
        attendanceByEnrollment.set(row.enrollment_id, row.status as string)
      }
    }
  }

  // Build lessons-completed-per-student map
  const lessonsByStudent = new Map<string, number>()
  for (const lp of lessonsResult.data ?? []) {
    lessonsByStudent.set(lp.user_id, (lessonsByStudent.get(lp.user_id) ?? 0) + 1)
  }

  // Build submissions-per-student map
  const submissionsByStudent = new Map<string, number>()
  for (const sub of submissionsResult.data ?? []) {
    submissionsByStudent.set(sub.student_id, (submissionsByStudent.get(sub.student_id) ?? 0) + 1)
  }

  // Build overdue-per-tenant map
  const overdueByTenant = new Map<string, number>()
  for (const { tenantId, count } of overdueResults) {
    overdueByTenant.set(tenantId, count)
  }

  return {
    lessonsByStudent,
    submissionsByStudent,
    attendanceByEnrollment,
    enrollmentsByStudent,
    overdueByTenant,
  }
}

// ── Resolve DigestData from in-memory maps ────────────────────────────────

function resolveChildActivity(
  studentId: string,
  tenantId: string,
  maps: BatchActivityMaps
): DigestData {
  const lessonsCompleted = maps.lessonsByStudent.get(studentId) ?? 0
  const assignmentsSubmitted = maps.submissionsByStudent.get(studentId) ?? 0
  const overdueAssignments = maps.overdueByTenant.get(tenantId) ?? 0

  // Resolve attendance via enrollment IDs
  let attendanceStatus: DigestData['attendanceStatus'] = 'tidak_ada_data'
  const enrIds = maps.enrollmentsByStudent.get(studentId) ?? []
  for (const enrId of enrIds) {
    const rawStatus = maps.attendanceByEnrollment.get(enrId)
    if (rawStatus !== undefined) {
      const s = rawStatus.toLowerCase()
      attendanceStatus = s === 'hadir' || s === 'present' ? 'hadir' : 'absen'
      break
    }
  }

  return { lessonsCompleted, assignmentsSubmitted, overdueAssignments, attendanceStatus }
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

    const typedSettings = digestSettings as DigestSetting[]

    // ── Sprint 3.3: Batch pre-fetch — eliminates N+1 query pattern ─────────

    // Step 1: Collect all parent IDs and unique tenant IDs
    const parentIds = typedSettings.map((s) => s.parent_id)
    const uniqueTenantIds = [...new Set(typedSettings.map((s) => s.tenant_id))]

    // Step 2: Batch-fetch ALL parent-child links for all parents at once
    const { data: allLinks } = await supabase
      .from('student_parent_links')
      .select('parent_id, student_id, tenant_id, profiles!student_id(full_name)')
      .in('parent_id', parentIds)
      .in('tenant_id', uniqueTenantIds)

    if (!allLinks || allLinks.length === 0) {
      // No children found for any parent — skip all
      result.skipped = typedSettings.length
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Step 3: Collect all unique student IDs
    const uniqueStudentIds = [...new Set(allLinks.map((l) => l.student_id as string))]

    // Step 4: Batch-fetch ALL activity data for all students at once
    const activityMaps = await fetchBatchActivityData(
      supabase,
      uniqueStudentIds,
      uniqueTenantIds,
      todayStr
    )

    // Step 5: Batch-fetch all parent profiles for WhatsApp sending
    const { data: parentProfiles } = await supabase
      .from('profiles')
      .select('id, phone')
      .in('id', parentIds)

    const phoneByParent = new Map<string, string | null>()
    for (const p of parentProfiles ?? []) {
      phoneByParent.set(p.id as string, p.phone as string | null)
    }

    // ── Step 6: Process each parent from in-memory data (no DB queries in loop) ──

    for (const setting of typedSettings) {
      try {
        // Filter children for this parent from the pre-fetched links
        const children = allLinks.filter(
          (l) => l.parent_id === setting.parent_id && l.tenant_id === setting.tenant_id
        )

        if (!children || children.length === 0) {
          result.skipped++
          continue
        }

        // Generate digest for each child using in-memory maps
        const notificationParts: string[] = []

        for (const link of children as Record<string, unknown>[]) {
          const studentId = link.student_id as string
          const profileData = link.profiles as { full_name: string } | null
          const childName = profileData?.full_name?.split(' ')[0] ?? 'Anak'

          // Resolve activity from in-memory maps — zero DB queries
          const activityData = resolveChildActivity(studentId, setting.tenant_id, activityMaps)

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
          // Use pre-fetched phone number — no DB query needed
          const parentPhone = phoneByParent.get(setting.parent_id) ?? null

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
