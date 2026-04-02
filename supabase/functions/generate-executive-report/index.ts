// ==========================================================================
// EduSync LMS — Generate Executive Report Edge Function
//
// Input:  { tenantId, reportType: 'monthly' | 'academic' | 'roi', month?, year? }
// Auth:   principal atau admin saja
// Output: { reportData: ExecutiveReportData }
// ==========================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { corsHeaders, handleCors } from '../_shared/cors.ts'

/* ─── Types ────────────────────────────────────────────────── */

type ReportType = 'monthly' | 'academic' | 'roi'

interface RequestBody {
  tenantId: string
  reportType: ReportType
  month?: number // 1-12
  year?: number
}

interface ExecutiveOverviewRow {
  total_students: number
  active_students: number
  total_teachers: number
  active_teachers: number
  total_courses: number
  avg_quiz_score: number
  adoption_rate: number
}

interface ActivityTimelineRow {
  event_date: string
  lesson_completions: number
  quiz_attempts: number
}

interface ActivityCountRow {
  event_type: string
  count: number
}

interface PrincipalSettingsRow {
  school_name?: string
  academic_year?: string
  logo_url?: string | null
}

export interface ReportMetric {
  label: string
  value: string
  sub?: string
}

export interface MonthlyTrendRow {
  month: string
  active_students: number
  lesson_completions: number
  quiz_attempts: number
}

export interface ExecutiveReportData {
  reportType: ReportType
  generatedAt: string
  period: string // e.g. "April 2026"
  schoolName: string
  academicYear: string
  // Overview metrics
  metrics: ReportMetric[]
  // Monthly trend table (last 6 months)
  monthlyTrend: MonthlyTrendRow[]
  // Academic stats
  academic: {
    avgScore: number
    projectedPassRate: number
    totalStudents: number
    activeStudents: number
    atRiskStudents: number
    totalCourses: number
  }
  // Platform adoption
  adoption: {
    studentAdoptionPct: number
    teacherAdoptionPct: number
    adoptionScore: number
  }
  // ROI
  roi: {
    paperSavedSheets: number
    paperSavedCost: number
    teacherTimeSavedHours: number
  }
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

const ID_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
]

function fmtNumber(n: number): string {
  return new Intl.NumberFormat('id-ID').format(Math.round(n))
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(n)
}

function fmtPercent(n: number): string {
  return `${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(n)}%`
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

    // ── Role check: only principal or admin ──
    const userRole = (user.app_metadata?.role as string) ?? ''
    const userRoles = (user.app_metadata?.roles as string[]) ?? [userRole]
    const isPrincipalOrAdmin =
      userRoles.some((r) => ['principal', 'admin'].includes(r)) ||
      ['principal', 'admin'].includes(userRole)

    if (!isPrincipalOrAdmin) {
      return new Response(
        JSON.stringify({
          error: 'Akses ditolak. Hanya kepala sekolah atau admin yang dapat membuat laporan.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── Parse body ──
    const body: RequestBody = await req.json()
    const { tenantId, reportType = 'monthly', month, year } = body

    if (!tenantId) {
      return new Response(JSON.stringify({ error: 'tenantId wajib diisi' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const now = new Date()
    const reportMonth = month ?? now.getMonth() + 1
    const reportYear = year ?? now.getFullYear()
    const periodLabel = `${ID_MONTHS[reportMonth - 1]} ${reportYear}`

    // ── Fetch data ──
    const [overviewResult, timelineResult, countsResult, settingsResult] = await Promise.allSettled(
      [
        supabase.rpc('get_executive_overview', { p_tenant_id: tenantId }),
        supabase.rpc('get_activity_timeline', { p_tenant_id: tenantId, p_days: 180 }),
        supabase.rpc('get_tenant_activity_counts', { p_tenant_id: tenantId, p_days: 30 }),
        supabase
          .from('principal_settings')
          .select('school_name,academic_year,logo_url')
          .eq('tenant_id', tenantId)
          .maybeSingle(),
      ]
    )

    // ── Extract overview ──
    const overviewRaw =
      overviewResult.status === 'fulfilled' && !overviewResult.value.error
        ? ((Array.isArray(overviewResult.value.data)
            ? overviewResult.value.data[0]
            : overviewResult.value.data) as ExecutiveOverviewRow | null)
        : null

    const overview: ExecutiveOverviewRow = overviewRaw ?? {
      total_students: 0,
      active_students: 0,
      total_teachers: 0,
      active_teachers: 0,
      total_courses: 0,
      avg_quiz_score: 0,
      adoption_rate: 0,
    }

    // ── Extract settings ──
    const settingsRaw =
      settingsResult.status === 'fulfilled' && !settingsResult.value.error
        ? (settingsResult.value.data as PrincipalSettingsRow | null)
        : null

    const schoolName = settingsRaw?.school_name ?? 'EduSync School'
    const academicYear = settingsRaw?.academic_year ?? `${reportYear}/${reportYear + 1}`

    // ── Monthly trend ──
    const timelineRaw =
      timelineResult.status === 'fulfilled' && !timelineResult.value.error
        ? ((timelineResult.value.data as ActivityTimelineRow[]) ?? [])
        : []

    const monthlyMap = new Map<string, MonthlyTrendRow>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(reportYear, reportMonth - 1 - i, 1)
      const key = `${ID_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
      monthlyMap.set(key, {
        month: key,
        active_students: 0,
        lesson_completions: 0,
        quiz_attempts: 0,
      })
    }

    for (const row of timelineRaw) {
      const date = new Date(row.event_date)
      const key = `${ID_MONTHS_SHORT[date.getMonth()]} ${date.getFullYear()}`
      const existing = monthlyMap.get(key)
      if (existing) {
        existing.lesson_completions += Number(row.lesson_completions ?? 0)
        existing.quiz_attempts += Number(row.quiz_attempts ?? 0)
        existing.active_students = Math.max(
          existing.active_students,
          Number(row.lesson_completions ?? 0)
        )
      }
    }

    const monthlyTrend = Array.from(monthlyMap.values())

    // ── ROI from activity counts ──
    const countsRaw =
      countsResult.status === 'fulfilled' && !countsResult.value.error
        ? ((countsResult.value.data as ActivityCountRow[]) ?? [])
        : []

    const lessonCompletions = countsRaw.find((c) => c.event_type === 'LESSON_COMPLETED')?.count ?? 0
    const quizAttempts = countsRaw.find((c) => c.event_type === 'QUIZ_SUBMITTED')?.count ?? 0
    const assignmentsGraded =
      countsRaw.find((c) => c.event_type === 'ASSIGNMENT_GRADED')?.count ?? 0

    const paperSavedSheets = quizAttempts * 2 + lessonCompletions * 1
    const paperSavedCost = paperSavedSheets * 500
    const teacherTimeSavedHours = Math.round(((assignmentsGraded * 10) / 60) * 10) / 10

    // ── Academic metrics ──
    const avgScore = Number(overview.avg_quiz_score ?? 0)
    const projectedPassRate = avgScore >= 70 ? Math.min(95, avgScore + 5) : avgScore * 0.8

    const studentAdoptionPct =
      overview.total_students > 0 ? (overview.active_students / overview.total_students) * 100 : 0
    const teacherAdoptionPct =
      overview.total_teachers > 0 ? (overview.active_teachers / overview.total_teachers) * 100 : 0

    // ── Build summary metrics ──
    const metrics: ReportMetric[] = [
      {
        label: 'Siswa Aktif',
        value: fmtNumber(overview.active_students),
        sub: `${fmtNumber(overview.active_students)} dari ${fmtNumber(overview.total_students)} siswa (${fmtPercent(studentAdoptionPct)})`,
      },
      {
        label: 'Guru Aktif',
        value: fmtNumber(overview.active_teachers),
        sub: `${fmtNumber(overview.active_teachers)} dari ${fmtNumber(overview.total_teachers)} guru (${fmtPercent(teacherAdoptionPct)})`,
      },
      {
        label: 'Kursus Aktif',
        value: fmtNumber(overview.total_courses),
        sub: 'kursus dipublikasikan',
      },
      {
        label: 'Rata-rata Nilai',
        value: `${fmtNumber(avgScore)}/100`,
        sub: `Tingkat kelulusan proyeksi: ${fmtPercent(projectedPassRate)}`,
      },
      {
        label: 'Penghematan Kertas',
        value: `~${fmtNumber(paperSavedSheets)} lembar`,
        sub: `Setara ${fmtCurrency(paperSavedCost)} per bulan`,
      },
      {
        label: 'Efisiensi Waktu Guru',
        value: `~${teacherTimeSavedHours} jam/minggu`,
        sub: 'dari penilaian tugas digital',
      },
    ]

    const reportData: ExecutiveReportData = {
      reportType,
      generatedAt: new Date().toISOString(),
      period: periodLabel,
      schoolName,
      academicYear,
      metrics,
      monthlyTrend,
      academic: {
        avgScore,
        projectedPassRate,
        totalStudents: Number(overview.total_students),
        activeStudents: Number(overview.active_students),
        atRiskStudents: Math.max(
          0,
          Number(overview.total_students) - Number(overview.active_students)
        ),
        totalCourses: Number(overview.total_courses),
      },
      adoption: {
        studentAdoptionPct,
        teacherAdoptionPct,
        adoptionScore: Number(overview.adoption_rate ?? 0),
      },
      roi: {
        paperSavedSheets,
        paperSavedCost,
        teacherTimeSavedHours,
      },
    }

    return new Response(JSON.stringify({ reportData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[generate-executive-report] error:', err)
    return new Response(JSON.stringify({ error: 'Gagal membuat laporan. Silakan coba lagi.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
