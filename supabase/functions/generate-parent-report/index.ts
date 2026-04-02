// ==========================================================================
// EduSync LMS — Generate Parent Monthly Report Edge Function
// Wave 4 — Task 29.6
//
// Input:  { studentId, month, year, tenantId }
// Auth:   hanya parent yang linked ke studentId
// Output: { reportData: ParentMonthlyReport }
// ==========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders, handleCors } from '../_shared/cors.ts'

/* ─── Types ────────────────────────────────────────────────── */

interface RequestBody {
  studentId: string
  month: number // 1-12
  year: number
  tenantId: string
}

interface SubjectReport {
  name: string
  avg_score: number
  assignments_completed: number
  quizzes_taken: number
  best_quiz_score: number
}

interface AchievementItem {
  type: 'badge' | 'level_up' | 'streak'
  name: string
  earned_at: string
}

interface ParentMonthlyReport {
  student: {
    name: string
    class: string
    avatar: string | null
  }
  period: {
    month: number
    year: number
    month_name: string
  }
  academic: {
    subjects: SubjectReport[]
    overall_avg: number
  }
  attendance: {
    total_days: number
    present: number
    sick: number
    excused: number
    absent: number
    attendance_rate: number
  }
  learning: {
    lessons_completed: number
    total_study_time_minutes: number
    ai_tutor_sessions: number
  }
  achievements: AchievementItem[]
  teacher_notes: string | null
}

/* ─── Helpers ──────────────────────────────────────────────── */

const ID_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 0) // last day of month
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { start: fmt(start), end: fmt(end) }
}

/* ─── Main Handler ─────────────────────────────────────────── */

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    // ── Auth check ──
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Token autentikasi diperlukan' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Token tidak valid atau kedaluwarsa' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ──
    const body: RequestBody = await req.json()
    const { studentId, month, year, tenantId } = body

    if (!studentId || !month || !year || !tenantId) {
      return new Response(
        JSON.stringify({ error: 'studentId, month, year, dan tenantId wajib diisi' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (month < 1 || month > 12) {
      return new Response(JSON.stringify({ error: 'Bulan harus antara 1-12' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Verify parent-student link ──
    // Orang tua hanya bisa melihat data anak mereka sendiri
    const userRole = (user.app_metadata?.role as string) ?? ''
    const userRoles = (user.app_metadata?.roles as string[]) ?? [userRole]
    const isParent = userRoles.some((r) => r === 'parent') || userRole === 'parent'
    const isAdminOrPrincipal =
      userRoles.some((r) => ['admin', 'principal'].includes(r)) ||
      ['admin', 'principal'].includes(userRole)

    if (!isAdminOrPrincipal) {
      // Verifikasi link parent-student untuk role parent
      const { data: linkData, error: linkError } = await supabase
        .from('parent_student_links')
        .select('student_id')
        .eq('parent_user_id', user.id)
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .maybeSingle()

      if (linkError || !linkData) {
        // Coba tabel alternatif
        const { data: profileLink, error: profileLinkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', studentId)
          .eq('tenant_id', tenantId)
          .maybeSingle()

        if (profileLinkError || !profileLink || !isParent) {
          return new Response(
            JSON.stringify({
              error: 'Akses ditolak. Anda tidak memiliki izin untuk melihat data siswa ini.',
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    }

    // ── Date range untuk bulan ini ──
    const { start: monthStart, end: monthEnd } = getMonthRange(year, month)
    const monthName = `${ID_MONTHS[month - 1]} ${year}`

    // ── Fetch semua data secara paralel ──
    const [
      studentResult,
      gradesResult,
      attendanceResult,
      lessonsResult,
      quizResult,
      achievementsResult,
      teacherNotesResult,
    ] = await Promise.allSettled([
      // 1. Info siswa
      supabase
        .from('profiles')
        .select('full_name, first_name, last_name, avatar_url')
        .eq('id', studentId)
        .eq('tenant_id', tenantId)
        .maybeSingle(),

      // 2. Nilai (gradebook entries bulan ini)
      supabase
        .from('gradebook_entries')
        .select('score, max_score, created_at, courses:course_id(title)')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`)
        .order('created_at', { ascending: false }),

      // 3. Kehadiran bulan ini
      supabase
        .from('attendance_records')
        .select('date, status')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .gte('date', monthStart)
        .lte('date', monthEnd),

      // 4. Lesson completions bulan ini
      supabase
        .from('lesson_progress')
        .select('id, completed_at, time_spent_seconds')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .eq('completed', true)
        .gte('completed_at', `${monthStart}T00:00:00`)
        .lte('completed_at', `${monthEnd}T23:59:59`),

      // 5. Quiz attempts bulan ini
      supabase
        .from('quiz_attempts')
        .select('id, score, max_score, completed_at, courses:course_id(title)')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('completed_at', `${monthStart}T00:00:00`)
        .lte('completed_at', `${monthEnd}T23:59:59`),

      // 6. Activity events (badge/level/streak) bulan ini
      supabase
        .from('activity_events')
        .select('event_type, metadata, created_at')
        .eq('user_id', studentId)
        .in('event_type', ['BADGE_AWARDED', 'LEVEL_UP', 'STREAK_MILESTONE'])
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(20),

      // 7. Catatan guru (teacher notes bulan ini)
      supabase
        .from('teacher_notes')
        .select('note, created_at')
        .eq('student_id', studentId)
        .eq('tenant_id', tenantId)
        .gte('created_at', `${monthStart}T00:00:00`)
        .lte('created_at', `${monthEnd}T23:59:59`)
        .order('created_at', { ascending: false })
        .limit(1),
    ])

    // ── Ekstrak data siswa ──
    const studentRaw =
      studentResult.status === 'fulfilled' && !studentResult.value.error
        ? (studentResult.value.data as Record<string, unknown> | null)
        : null

    const studentName =
      ((studentRaw?.full_name as string) ??
        `${(studentRaw?.first_name as string) ?? ''} ${(studentRaw?.last_name as string) ?? ''}`.trim()) ||
      'Siswa'
    const studentAvatar = (studentRaw?.avatar_url as string | null) ?? null

    // Ambil nama kelas dari enrollments
    const { data: enrollmentData } = await supabase
      .from('enrollments')
      .select('classes:class_id(name)')
      .eq('student_id', studentId)
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    const className =
      ((enrollmentData as Record<string, unknown> | null)?.classes as { name: string } | null)
        ?.name ?? 'Tidak ada kelas'

    // ── Ekstrak nilai & akademik ──
    const gradesRaw =
      gradesResult.status === 'fulfilled' && !gradesResult.value.error
        ? ((gradesResult.value.data as Record<string, unknown>[]) ?? [])
        : []

    const quizRaw =
      quizResult.status === 'fulfilled' && !quizResult.value.error
        ? ((quizResult.value.data as Record<string, unknown>[]) ?? [])
        : []

    // Group nilai per mata pelajaran
    const subjectMap = new Map<
      string,
      { scores: number[]; assignmentCount: number; quizCount: number; bestQuiz: number }
    >()

    for (const row of gradesRaw) {
      const courseData = row.courses as { title: string } | null
      const subject = courseData?.title ?? 'Mata Pelajaran'
      const maxScore = Number(row.max_score ?? 100)
      const score = maxScore > 0 ? Math.round((Number(row.score ?? 0) / maxScore) * 100) : 0

      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { scores: [], assignmentCount: 0, quizCount: 0, bestQuiz: 0 })
      }
      const entry = subjectMap.get(subject)!
      entry.scores.push(score)
      entry.assignmentCount += 1
    }

    // Tambahkan data kuis per mata pelajaran
    for (const row of quizRaw) {
      const courseData = row.courses as { title: string } | null
      const subject = courseData?.title ?? 'Mata Pelajaran'
      const maxScore = Number(row.max_score ?? 100)
      const score = maxScore > 0 ? Math.round((Number(row.score ?? 0) / maxScore) * 100) : 0

      if (!subjectMap.has(subject)) {
        subjectMap.set(subject, { scores: [], assignmentCount: 0, quizCount: 0, bestQuiz: 0 })
      }
      const entry = subjectMap.get(subject)!
      entry.quizCount += 1
      if (score > entry.bestQuiz) entry.bestQuiz = score
    }

    const subjects: SubjectReport[] = []
    for (const [name, data] of subjectMap) {
      const avg =
        data.scores.length > 0
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          : 0
      subjects.push({
        name,
        avg_score: avg,
        assignments_completed: data.assignmentCount,
        quizzes_taken: data.quizCount,
        best_quiz_score: data.bestQuiz,
      })
    }

    const overallAvg =
      subjects.length > 0
        ? Math.round(subjects.reduce((s, sub) => s + sub.avg_score, 0) / subjects.length)
        : 0

    // ── Ekstrak kehadiran ──
    const attendanceRaw =
      attendanceResult.status === 'fulfilled' && !attendanceResult.value.error
        ? ((attendanceResult.value.data as Record<string, unknown>[]) ?? [])
        : []

    let present = 0
    let sick = 0
    let excused = 0
    let absent = 0

    for (const row of attendanceRaw) {
      const status = (row.status as string)?.toLowerCase()
      if (status === 'hadir' || status === 'present') present++
      else if (status === 'sakit' || status === 'sick') sick++
      else if (status === 'izin' || status === 'excused') excused++
      else absent++ // alpha / absent / etc.
    }

    const totalDays = present + sick + excused + absent
    const attendanceRate = totalDays > 0 ? Math.round((present / totalDays) * 100) : 0

    // ── Ekstrak aktivitas belajar ──
    const lessonsRaw =
      lessonsResult.status === 'fulfilled' && !lessonsResult.value.error
        ? ((lessonsResult.value.data as Record<string, unknown>[]) ?? [])
        : []

    const lessonsCompleted = lessonsRaw.length
    const totalStudyTimeSeconds = lessonsRaw.reduce(
      (sum, row) => sum + Number(row.time_spent_seconds ?? 0),
      0
    )
    const totalStudyTimeMinutes = Math.round(totalStudyTimeSeconds / 60)

    // Hitung sesi AI Tutor dari activity_events
    const { data: aiSessionData } = await supabase
      .from('activity_events')
      .select('id')
      .eq('user_id', studentId)
      .eq('event_type', 'AI_TUTOR_INTERACTION')
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${monthEnd}T23:59:59`)

    const aiTutorSessions = (aiSessionData as unknown[] | null)?.length ?? 0

    // ── Ekstrak pencapaian ──
    const achievementsRaw =
      achievementsResult.status === 'fulfilled' && !achievementsResult.value.error
        ? ((achievementsResult.value.data as Record<string, unknown>[]) ?? [])
        : []

    const achievements: AchievementItem[] = achievementsRaw.map((row) => {
      const eventType = row.event_type as string
      const meta = (row.metadata as Record<string, unknown>) ?? {}
      const earnedAt = row.created_at as string

      if (eventType === 'BADGE_AWARDED') {
        return {
          type: 'badge' as const,
          name: (meta.badge_name as string) ?? 'Badge baru',
          earned_at: earnedAt,
        }
      } else if (eventType === 'LEVEL_UP') {
        return {
          type: 'level_up' as const,
          name: `Naik ke Level ${(meta.new_level as number) ?? ''}`,
          earned_at: earnedAt,
        }
      } else {
        return {
          type: 'streak' as const,
          name: `Streak ${(meta.streak_days as number) ?? ''} hari`,
          earned_at: earnedAt,
        }
      }
    })

    // ── Ekstrak catatan guru ──
    const notesRaw =
      teacherNotesResult.status === 'fulfilled' && !teacherNotesResult.value.error
        ? ((teacherNotesResult.value.data as Record<string, unknown>[]) ?? [])
        : []

    const teacherNotes = notesRaw.length > 0 ? ((notesRaw[0].note as string | null) ?? null) : null

    // ── Build report ──
    const reportData: ParentMonthlyReport = {
      student: {
        name: studentName,
        class: className,
        avatar: studentAvatar,
      },
      period: {
        month,
        year,
        month_name: monthName,
      },
      academic: {
        subjects,
        overall_avg: overallAvg,
      },
      attendance: {
        total_days: totalDays,
        present,
        sick,
        excused,
        absent,
        attendance_rate: attendanceRate,
      },
      learning: {
        lessons_completed: lessonsCompleted,
        total_study_time_minutes: totalStudyTimeMinutes,
        ai_tutor_sessions: aiTutorSessions,
      },
      achievements,
      teacher_notes: teacherNotes,
    }

    return new Response(JSON.stringify({ reportData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-parent-report] error:', err)
    return new Response(JSON.stringify({ error: 'Gagal membuat laporan. Silakan coba lagi.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
