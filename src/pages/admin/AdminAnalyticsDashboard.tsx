import {
  Activity,
  AlertCircle,
  BarChart,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  Clock,
  FileCheck,
  GraduationCap,
  LayoutGrid,
  RefreshCw,
  TrendingUp,
  Users,
} from 'lucide-react'
import React, { useCallback, useMemo } from 'react'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { EmptyState } from '@/components/ui'
import { useTheme } from '@/contexts/ThemeContext'
import { AdministrationSkeleton } from '@/features/administration/components/AdministrationSkeleton'
import { ActivityTimePoint, CourseEngagement } from '@/features/analytics'
import { useTenantAnalytics } from '@/features/analytics/queries/analyticsQueries'
import { usePageTitle } from '@/hooks/usePageTitle'
import { formatDateTime, formatNumber } from '@/shared/utils/format-id'
import { cn } from '@/utils/cn'

// Color palette for charts
interface MetricCardProps {
  title: string
  value: number | string
  icon: React.ElementType
  trend?: {
    value: number
    isPositive: boolean
  }
  color: string
  bgColor: string
}

function MetricCard({ title, value, icon: Icon, trend, color, bgColor }: MetricCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', bgColor)}>
          <Icon className={cn('w-6 h-6', color)} />
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              trend.isPositive ? 'text-emerald-600' : 'text-red-600'
            )}
          >
            <TrendingUp className={cn('w-4 h-4', !trend.isPositive && 'rotate-180')} />
            <span>{trend.value}%</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{title}</p>
        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">
          {typeof value === 'number' ? formatNumber(value) : value}
        </p>
      </div>
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Terjadi Kesalahan
      </h3>
      <p className="mt-2 text-slate-500 dark:text-slate-400 text-center max-w-md">{message}</p>
      <button
        onClick={onRetry}
        className="mt-6 px-6 py-2 bg-blue-600 dark:bg-blue-500 text-white font-medium rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Coba Lagi
      </button>
    </div>
  )
}

interface ActivityTimelineChartProps {
  data: ActivityTimePoint[]
}

// ⚡ Perf: hoisted outside component to prevent new function ref every render
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })
}

// ⚡ Perf: stable labelFormatter ref for Tooltip
const tooltipLabelFormatter = (label: unknown) => formatDate(String(label))

function ActivityTimelineChart({ data }: ActivityTimelineChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Aktivitas Waktu</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aktivitas pembelajaran 14 hari terakhir
          </p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fill: isDark ? '#94a3b8' : '#94A3B8', fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
              tickLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
            />
            <YAxis
              tick={{ fill: isDark ? '#94a3b8' : '#94A3B8', fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
              tickLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
            />
            <Tooltip
              labelFormatter={tooltipLabelFormatter}
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#fff',
                border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                borderRadius: '0.5rem',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="lessonCompletions"
              name="Lesson Selesai"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: '#3B82F6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="quizAttempts"
              name="Quiz Dicoba"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: '#10B981', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="assignmentSubmissions"
              name="Tugas Dikumpulkan"
              stroke="#F59E0B"
              strokeWidth={2}
              dot={{ fill: '#F59E0B', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface CourseEngagementChartProps {
  data: CourseEngagement[]
}

function CourseEngagementChart({ data }: CourseEngagementChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  // ⚡ Perf: memoize slice+map — prevents new array ref on every render
  const chartData = useMemo(
    () =>
      data.slice(0, 6).map((course) => ({
        name:
          course.courseName.length > 20
            ? course.courseName.substring(0, 20) + '...'
            : course.courseName,
        students: course.enrolled,
        active: course.activeStudents,
        progress: course.avgProgress,
      })),
    [data]
  )

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Engagement per Kursus
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Perbandingan enrollment dan aktivitas
          </p>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsBarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#E2E8F0'} />
            <XAxis
              type="number"
              tick={{ fill: isDark ? '#94a3b8' : '#94A3B8', fontSize: 12 }}
              axisLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
              tickLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
            />
            <YAxis
              dataKey="name"
              type="category"
              width={120}
              tick={{ fill: isDark ? '#94a3b8' : '#94A3B8', fontSize: 11 }}
              axisLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
              tickLine={{ stroke: isDark ? '#334155' : '#E2E8F0' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#fff',
                border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                borderRadius: '0.5rem',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
            />
            <Legend />
            <Bar dataKey="students" name="Terenroll" fill="#3B82F6" radius={[0, 4, 4, 0]} />
            <Bar dataKey="active" name="Aktif" fill="#10B981" radius={[0, 4, 4, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface StudentParticipationChartProps {
  totalEnrolled: number
  activeStudents: number
}

function StudentParticipationChart({
  totalEnrolled,
  activeStudents,
}: StudentParticipationChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  // ⚡ Perf: memoize pie data + participation rate
  const { data, participationRate } = useMemo(() => {
    const inactiveStudents = Math.max(0, totalEnrolled - activeStudents)
    return {
      data: [
        { name: 'Aktif', value: activeStudents, color: '#10B981' },
        { name: 'Tidak Aktif', value: inactiveStudents, color: '#94A3B8' },
      ],
      participationRate: totalEnrolled > 0 ? Math.round((activeStudents / totalEnrolled) * 100) : 0,
    }
  }, [totalEnrolled, activeStudents])

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Partisipasi Siswa</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Rasio siswa aktif vs total</p>
        </div>
      </div>
      <div className="h-72 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={5}
              dataKey="value"
              label={({ name, percent }: { name?: string; percent?: number }) =>
                `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? '#1e293b' : '#fff',
                border: `1px solid ${isDark ? '#334155' : '#E2E8F0'}`,
                borderRadius: '0.5rem',
                color: isDark ? '#f1f5f9' : '#0f172a',
              }}
              labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }}
            />
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {participationRate}%
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Tingkat Partisipasi</p>
      </div>
    </div>
  )
}

export function AdminAnalyticsDashboard() {
  usePageTitle('Dasbor Analitik Admin')
  const { data: analytics, isLoading, error, refetch } = useTenantAnalytics()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  // ⚡ Perf: stabilize refresh handler ref
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    void refetch().finally(() => setIsRefreshing(false))
  }, [refetch])

  // ⚡ Perf: stable retry ref for ErrorState
  const handleRetry = useCallback(() => refetch(), [refetch])

  // Loading state
  if (isLoading) {
    return <AdministrationSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <ErrorState
          message={
            error instanceof Error
              ? error.message
              : 'Gagal memuat data analitik. Silakan coba lagi.'
          }
          onRetry={handleRetry}
        />
      </div>
    )
  }

  // Empty state - no data
  if (
    !analytics ||
    !analytics.overview ||
    (analytics.overview.totalCourses === 0 && analytics.overview.totalEnrolled === 0)
  ) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <EmptyState
          icon={<BarChart3 className="w-8 h-8" />}
          title="Belum Ada Data"
          description="Data analitik akan muncul setelah ada aktivitas pembelajaran di platform. Pastikan siswa telah enroll dan menyelesaikan lesson."
        />
      </div>
    )
  }

  const { overview, activityMetrics, courseEngagement, activityTimeline } = analytics

  // activityMetrics may be null if that analytics slice failed (Promise.allSettled partial failure)
  const safeMetrics = activityMetrics ?? {
    assignmentSubmissions: 0,
    quizAttempts: 0,
    totalEvents: 0,
    lessonCompletions: 0,
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Dashboard Analitik
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Pantau aktivitas pembelajaran di seluruh organisasi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {overview.lastRefreshedAt && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Clock className="w-4 h-4" />
              <span>Diperbarui: {formatDateTime(overview.lastRefreshedAt)}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            {isRefreshing ? 'Memperbarui...' : 'Perbarui'}
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard
          title="Total Siswa Terenroll"
          value={overview.totalEnrolled}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <MetricCard
          title="Siswa Aktif (7 Hari)"
          value={overview.activeStudents}
          icon={Activity}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
        <MetricCard
          title="Total Kursus"
          value={overview.totalCourses}
          icon={BookOpen}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <MetricCard
          title="Kursus Berjalan"
          value={overview.coursesRunning}
          icon={GraduationCap}
          color="text-amber-600"
          bgColor="bg-amber-100"
        />
        <MetricCard
          title="Tugas Dikumpulkan"
          value={safeMetrics.assignmentSubmissions}
          icon={FileCheck}
          color="text-cyan-600"
          bgColor="bg-cyan-100"
        />
        <MetricCard
          title="Quiz Dicoba"
          value={safeMetrics.quizAttempts}
          icon={ClipboardCheck}
          color="text-rose-600"
          bgColor="bg-rose-100"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ActivityTimelineChart data={activityTimeline ?? []} />
        <CourseEngagementChart data={courseEngagement ?? []} />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StudentParticipationChart
          totalEnrolled={overview.totalEnrolled}
          activeStudents={overview.activeStudents}
        />

        {/* Summary Stats */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center">
              <LayoutGrid className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">Ringkasan</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Metrik tambahan</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <span className="text-slate-700 dark:text-slate-300">Rata-rata Progres</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {overview.avgProgress}%
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <BarChart className="w-5 h-5 text-emerald-600" />
                <span className="text-slate-700 dark:text-slate-300">Rata-rata Quiz Score</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {overview.avgQuizScore}%
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-purple-600" />
                <span className="text-slate-700 dark:text-slate-300">Total Event (30 Hari)</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatNumber(safeMetrics.totalEvents)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              <div className="flex items-center gap-3">
                <FileCheck className="w-5 h-5 text-amber-600" />
                <span className="text-slate-700 dark:text-slate-300">Lesson Selesai</span>
              </div>
              <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {formatNumber(safeMetrics.lessonCompletions)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
