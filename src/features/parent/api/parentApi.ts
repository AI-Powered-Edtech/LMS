// ==========================================================================
// Parent API — parentApi.ts
// Wave 4 — Task 29.3
//
// Supabase queries untuk Parent Dashboard.
// RLS di DB memastikan orang tua hanya bisa melihat data anak mereka sendiri.
// ==========================================================================

import { supabase } from '@/services/supabase/client'

import type {
  AttendanceDay,
  ChildGradeSummary,
  ChildInfo,
  PendingAssignment,
  TrafficLightStatus,
} from '../types'

// ── Get My Children ────────────────────────────────────────────

/**
 * Memanggil RPC get_my_children() untuk mendapatkan daftar anak yang terhubung
 * dengan orang tua yang sedang login.
 */
export async function getMyChildren(): Promise<ChildInfo[]> {
  const { data, error } = await supabase.rpc('get_my_children')

  if (error) {
    if (import.meta.env.DEV) console.error('[Parent] get_my_children error:', error)
    throw new Error('Gagal memuat daftar anak. Silakan coba lagi.')
  }

  if (!data || !Array.isArray(data)) return []

  return (data as Record<string, unknown>[]).map((row) => ({
    student_id: row.student_id as string,
    student_name: row.student_name as string,
    student_avatar: (row.student_avatar as string | null) ?? null,
    class_name: (row.class_name as string) ?? 'Tidak ada kelas',
    relationship: (row.relationship as ChildInfo['relationship']) ?? 'wali',
  }))
}

// ── Child Grades ───────────────────────────────────────────────

/**
 * Mengambil nilai terbaru siswa dari gradebook_entries.
 * Dikelompokkan per mata pelajaran (course), ambil 2 nilai terakhir untuk tren.
 */
export async function getChildGrades(studentId: string): Promise<ChildGradeSummary[]> {
  // Ambil entri nilai terbaru per course (via courses join)
  const { data, error } = await supabase
    .from('gradebook_entries')
    .select(
      `score, max_score, created_at,
       courses:course_id (title)`
    )
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    if (import.meta.env.DEV) console.error('[Parent] getChildGrades error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  // Kelompokkan per course, ambil 2 terakhir untuk tren
  const courseMap = new Map<string, { subject: string; scores: number[] }>()

  for (const row of data as Record<string, unknown>[]) {
    const courseData = row.courses as { title: string } | null
    const subject = courseData?.title ?? 'Mata Pelajaran'
    const maxScore = Number(row.max_score ?? 100)
    const score = maxScore > 0 ? Math.round((Number(row.score ?? 0) / maxScore) * 100) : 0

    if (!courseMap.has(subject)) {
      courseMap.set(subject, { subject, scores: [] })
    }
    const entry = courseMap.get(subject)!
    if (entry.scores.length < 2) {
      entry.scores.push(score)
    }
  }

  const result: ChildGradeSummary[] = []
  for (const [, entry] of courseMap) {
    if (entry.scores.length === 0) continue
    const latest = entry.scores[0]
    const previous = entry.scores.length > 1 ? entry.scores[1] : null

    let trend: ChildGradeSummary['trend'] = 'stable'
    if (previous !== null) {
      if (latest > previous + 2) trend = 'up'
      else if (latest < previous - 2) trend = 'down'
      else trend = 'stable'
    }

    result.push({
      subject: entry.subject,
      latest_score: latest,
      previous_score: previous,
      trend,
    })
  }

  // Batasi 6 mata pelajaran untuk tampilan dashboard
  return result.slice(0, 6)
}

// ── Monthly Attendance ──────────────────────────────────────────

/**
 * Mengambil data kehadiran bulanan untuk satu siswa.
 */
export async function getMonthlyAttendance(
  studentId: string,
  year: number,
  month: number
): Promise<AttendanceDay[]> {
  const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('attendance_records')
    .select('date, status')
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) {
    if (import.meta.env.DEV) console.error('[Parent] getMonthlyAttendance error:', error)
    return []
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const rawStatus = (row.status as string)?.toLowerCase()
    let status: AttendanceDay['status'] = 'alpha'
    if (rawStatus === 'hadir' || rawStatus === 'present') status = 'hadir'
    else if (rawStatus === 'sakit' || rawStatus === 'sick') status = 'sakit'
    else if (rawStatus === 'izin' || rawStatus === 'excused') status = 'izin'
    return { date: row.date as string, status }
  })
}

// ── Child Attendance ───────────────────────────────────────────

/**
 * Mengambil data kehadiran minggu ini (Senin-Jumat) untuk satu siswa.
 * weekStart: ISO date string (Senin minggu ini, format YYYY-MM-DD).
 * tenantId: ID tenant untuk memfilter enrollments dengan benar.
 */
export async function getChildAttendance(
  studentId: string,
  weekStart: string,
  tenantId: string
): Promise<AttendanceDay[]> {
  // Hitung Jumat (weekStart + 4 hari)
  const startDate = new Date(weekStart)
  const endDate = new Date(weekStart)
  endDate.setDate(startDate.getDate() + 4)
  const endStr = endDate.toISOString().split('T')[0]

  // attendance_records tidak memiliki kolom student_id — harus join via enrollment_id
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)

  const enrollmentIds = (enrollments ?? []).map((e: Record<string, unknown>) => e.id as string)

  if (enrollmentIds.length === 0) {
    return generateWeekSlots(weekStart)
  }

  const { data, error } = await supabase
    .from('attendance_records')
    .select('date, status')
    .in('enrollment_id', enrollmentIds)
    .gte('date', weekStart)
    .lte('date', endStr)
    .order('date', { ascending: true })

  if (error) {
    if (import.meta.env.DEV) console.error('[Parent] getChildAttendance error:', error)
    // Return empty slots untuk 5 hari
    return generateWeekSlots(weekStart)
  }

  // Buat map tanggal → status
  const attendanceMap = new Map<string, AttendanceDay['status']>()
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const dateStr = row.date as string
    const rawStatus = (row.status as string)?.toLowerCase()
    let status: AttendanceDay['status'] = 'alpha'
    if (rawStatus === 'hadir' || rawStatus === 'present') status = 'hadir'
    else if (rawStatus === 'sakit' || rawStatus === 'sick') status = 'sakit'
    else if (rawStatus === 'izin' || rawStatus === 'excused') status = 'izin'
    attendanceMap.set(dateStr, status)
  }

  // Generate 5 hari Senin-Jumat dengan status dari DB atau default 'alpha'
  return generateWeekSlots(weekStart, attendanceMap)
}

function generateWeekSlots(
  weekStart: string,
  attendanceMap?: Map<string, AttendanceDay['status']>
): AttendanceDay[] {
  const slots: AttendanceDay[] = []
  const start = new Date(weekStart)
  for (let i = 0; i < 5; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    // Hari yang belum lewat (masa depan) tidak ditampilkan sebagai alpha
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const isInFuture = d > today
    slots.push({
      date: dateStr,
      status: isInFuture
        ? 'hadir' // placeholder untuk hari belum terjadi
        : (attendanceMap?.get(dateStr) ?? 'alpha'),
    })
  }
  return slots
}

// ── Pending Assignments ────────────────────────────────────────

/**
 * Mengambil tugas yang belum dikumpulkan oleh siswa.
 * Mengambil assignments yang published dan belum ada submission dari siswa ini.
 */
export async function getChildPendingAssignments(
  studentId: string,
  tenantId: string
): Promise<PendingAssignment[]> {
  const now = new Date().toISOString()

  // Ambil semua assignment published untuk enrollment siswa ini.
  // Menggunakan kolom student_id sesuai dengan skema enrollments.
  const { data: enrollments, error: eErr } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('student_id', studentId)
    .eq('tenant_id', tenantId)

  if (eErr || !enrollments || enrollments.length === 0) return []

  const courseIds = enrollments.map((e: Record<string, unknown>) => e.course_id as string)

  const { data: assignments, error: aErr } = await supabase
    .from('assignments')
    .select(
      `id, title, due_date,
       courses:course_id (title)`
    )
    .eq('tenant_id', tenantId)
    .eq('is_published', true)
    .in('course_id', courseIds)
    .order('due_date', { ascending: true })
    .limit(20)

  if (aErr || !assignments || assignments.length === 0) return []

  // Ambil submission yang sudah ada dari siswa ini
  const assignmentIds = (assignments as Record<string, unknown>[]).map((a) => a.id as string)

  const { data: submissions, error: sErr } = await supabase
    .from('assignment_submissions')
    .select('assignment_id')
    .eq('student_id', studentId)
    .in('assignment_id', assignmentIds)
    .in('status', ['submitted', 'graded', 'returned'])

  if (sErr) {
    if (import.meta.env.DEV)
      console.error('[Parent] getChildPendingAssignments submissions error:', sErr)
  }

  const submittedIds = new Set(
    ((submissions ?? []) as Record<string, unknown>[]).map((s) => s.assignment_id as string)
  )

  const pending: PendingAssignment[] = []
  for (const a of assignments as Record<string, unknown>[]) {
    const id = a.id as string
    if (submittedIds.has(id)) continue

    const courseData = a.courses as { title: string } | null
    const dueDate = (a.due_date as string | null) ?? ''
    const isOverdue = dueDate ? new Date(dueDate) < new Date(now) : false

    pending.push({
      id,
      title: a.title as string,
      subject: courseData?.title ?? 'Mata Pelajaran',
      due_date: dueDate,
      is_overdue: isOverdue,
    })
  }

  return pending.slice(0, 10)
}

// ── Child Achievements ─────────────────────────────────────────

/**
 * Mengambil pencapaian (badge/XP) siswa dalam 7 hari terakhir.
 */
export async function getChildAchievements(studentId: string): Promise<string[]> {
  const since = new Date()
  since.setDate(since.getDate() - 7)

  // Coba ambil dari activity_events — badge awarded / XP gained
  const { data, error } = await supabase
    .from('activity_events')
    .select('event_type, metadata, created_at')
    .eq('user_id', studentId)
    .in('event_type', ['BADGE_AWARDED', 'XP_EARNED', 'LESSON_COMPLETED', 'QUIZ_COMPLETED'])
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    if (import.meta.env.DEV) console.error('[Parent] getChildAchievements error:', error)
    return []
  }

  if (!data || data.length === 0) return []

  const achievements: string[] = []
  for (const row of data as Record<string, unknown>[]) {
    const eventType = row.event_type as string
    const meta = row.metadata as Record<string, unknown> | null

    if (eventType === 'BADGE_AWARDED') {
      const badgeName = (meta?.badge_name as string) ?? 'Badge baru'
      achievements.push(`Meraih badge "${badgeName}"`)
    } else if (eventType === 'XP_EARNED') {
      const xpAmount = Number(meta?.xp_amount ?? meta?.amount ?? 0)
      if (xpAmount > 0) achievements.push(`+${xpAmount} XP diperoleh`)
    } else if (eventType === 'LESSON_COMPLETED') {
      const lessonTitle = (meta?.lesson_title as string) ?? 'Pelajaran'
      achievements.push(`Menyelesaikan "${lessonTitle}"`)
    } else if (eventType === 'QUIZ_COMPLETED') {
      const score = Number(meta?.score ?? 0)
      achievements.push(`Kuis selesai dengan nilai ${score}`)
    }
  }

  return achievements.slice(0, 5)
}

// ── Traffic Light Calculation ──────────────────────────────────

interface TrafficLightInput {
  pendingAssignments: PendingAssignment[]
  attendance: AttendanceDay[]
  grades: ChildGradeSummary[]
}

interface TrafficLightResult {
  status: TrafficLightStatus
  reason: string
}

/**
 * Menghitung status semaphore (traffic light) berdasarkan data siswa.
 *
 * Logika:
 * 🟢 Hijau: Semua tugas dikumpulkan, kehadiran ≥ 80%, tidak ada nilai < 60
 * 🟡 Kuning: Ada 1-2 tugas terlambat, kehadiran 60-79%, ada nilai 60-70
 * 🔴 Merah: Ada ≥ 3 tugas terlambat, kehadiran < 60%, ada nilai < 60
 */
export function calculateTrafficLight({
  pendingAssignments,
  attendance,
  grades,
}: TrafficLightInput): TrafficLightResult {
  const overdueCount = pendingAssignments.filter((a) => a.is_overdue).length

  // Hitung kehadiran (hanya hari yang sudah lewat)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pastDays = attendance.filter((d) => new Date(d.date) <= today)
  const hadirCount = pastDays.filter((d) => d.status === 'hadir').length
  const attendanceRate = pastDays.length > 0 ? (hadirCount / pastDays.length) * 100 : 100

  // Cek nilai minimum
  const minGrade = grades.length > 0 ? Math.min(...grades.map((g) => g.latest_score)) : 100

  // Kondisi MERAH
  if (overdueCount >= 3 || attendanceRate < 60 || minGrade < 60) {
    let reason = ''
    if (overdueCount >= 3) reason = `${overdueCount} tugas terlambat dikumpulkan`
    else if (attendanceRate < 60)
      reason = `Kehadiran hanya ${Math.round(attendanceRate)}% minggu ini`
    else reason = `Ada nilai di bawah 60`
    return { status: 'red', reason }
  }

  // Kondisi KUNING
  if (
    (overdueCount >= 1 && overdueCount <= 2) ||
    (attendanceRate >= 60 && attendanceRate < 80) ||
    (minGrade >= 60 && minGrade <= 70)
  ) {
    let reason = ''
    if (overdueCount >= 1) reason = `${overdueCount} tugas belum dikumpulkan`
    else if (attendanceRate < 80)
      reason = `Kehadiran ${Math.round(attendanceRate)}%, perlu ditingkatkan`
    else reason = `Beberapa nilai perlu ditingkatkan`
    return { status: 'yellow', reason }
  }

  // HIJAU
  const reasons = []
  if (grades.length > 0) {
    const avgGrade = Math.round(grades.reduce((s, g) => s + g.latest_score, 0) / grades.length)
    reasons.push(`Rata-rata nilai ${avgGrade}`)
  }
  if (pastDays.length > 0) {
    reasons.push(`Kehadiran ${Math.round(attendanceRate)}%`)
  }
  const reason = reasons.length > 0 ? reasons.join(', ') : 'Semua aktivitas berjalan baik'
  return { status: 'green', reason }
}
