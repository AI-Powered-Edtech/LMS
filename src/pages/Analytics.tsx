import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
  Users,
  WifiOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { AnalyticsCharts } from '@/features/analytics/components/AnalyticsCharts'
import { AnalyticsStudentTable } from '@/features/analytics/components/AnalyticsStudentTable'
import { useAnalyticsPageState } from '@/features/analytics/hooks/useAnalyticsPageState'
import { StruggleConfigPanel } from '@/features/struggle'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'

export function Analytics() {
  usePageTitle('Analitik')
  const navigate = useNavigate()
  const {
    activeTenant,
    activeRole,
    courses,
    selectedCourseId,
    setSelectedCourseId,
    data,
    isLoading,
    refreshMutation,
    errorMessage,
    handleManualRefresh,
    aiInsightMessage,
    handleAnalyzeWithAI,
    radarData,
    filter,
    setFilter,
    expandedRow,
    setExpandedRow,
    filteredStudents,
    getStatus,
    formatLastUpdated,
  } = useAnalyticsPageState()

  if (!activeTenant) return null

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
            Mesin Analitik Pembelajaran
          </h1>
          <p className="text-slate-500 mt-2">
            Pantau perkembangan komprehensif siswa menggunakan data teragregasi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedCourseId ?? ''}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className="bg-white border text-sm border-slate-200 text-slate-700 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 p-2.5 shadow-sm"
          >
            {courses.length === 0 && <option value="">Tidak ada kursus</option>}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>

          {courses.length === 0 && !isLoading && (
            <button
              onClick={() => navigate('/app/teacher/course-builder')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              Buat Kursus
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={refreshMutation.isPending || isLoading || !selectedCourseId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', refreshMutation.isPending && 'animate-spin')} />
            Perbarui
          </button>

          <button
            onClick={() => {
              if (selectedCourseId) {
                void navigate(`/app/teacher/course-analytics?courseId=${selectedCourseId}`)
              }
            }}
            disabled={!selectedCourseId}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all shadow-sm disabled:opacity-50"
          >
            <BarChart3 className="w-4 h-4" />
            Detail Analitik
          </button>

          <button
            onClick={handleAnalyzeWithAI}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all shadow-md hover:shadow-lg bg-indigo-600 hover:bg-indigo-700"
          >
            <Sparkles className="w-5 h-5" />
            AI Insight
          </button>
        </div>
      </div>

      {aiInsightMessage && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium">
          <Sparkles className="w-5 h-5 shrink-0" />
          {aiInsightMessage}
        </div>
      )}

      {data && (
        <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-lg">
          <Clock className="w-4 h-4" />
          <span>Terakhir diperbarui: {formatLastUpdated(data.overview.last_calculated_at)}</span>
        </div>
      )}

      {isLoading && !refreshMutation.isPending ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
          <p className="text-slate-500">Memuat data agregasi dari warehouse...</p>
        </div>
      ) : errorMessage ? (
        <div className="p-6 bg-red-50 text-red-600 rounded-xl border border-red-100 flex items-start gap-4">
          {errorMessage.includes('Koneksi') || errorMessage.includes('internet') ? (
            <WifiOff className="w-6 h-6 shrink-0" />
          ) : errorMessage.includes('akses') || errorMessage.includes('akses') ? (
            <AlertCircle className="w-6 h-6 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 shrink-0" />
          )}
          <div>
            <h3 className="font-bold">Gagal memuat analitik</h3>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        </div>
      ) : !data ? (
        <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Pilih kursus untuk melihat data analitik.</p>
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Total Terdaftar
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {data.overview.total_enrolled}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {data.overview.active_students} aktif berturut-turut
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Rata-rata Progress</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {data.overview.total_enrolled > 0 ? Math.round(data.overview.avg_progress) : 0}%
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tingkat penyelesaian {Math.round(data.overview.lesson_completion_rate)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Rata-rata Nilai Kuis
                </p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">
                  {Math.round(data.overview.avg_quiz_score)}%
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Tingkat kelulusan {Math.round(data.overview.quiz_pass_rate)}%
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Siswa At-Risk</p>
                <h3 className="text-2xl font-bold text-red-600 mt-1">
                  {data.overview.at_risk_count}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Butuh intervensi segera</p>
              </div>
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <AnalyticsCharts radarData={radarData} />
            <AnalyticsStudentTable
              filteredStudents={filteredStudents}
              filter={filter}
              setFilter={setFilter}
              expandedRow={expandedRow}
              setExpandedRow={setExpandedRow}
              getStatus={getStatus}
            />
          </div>
        </>
      )}

      {(activeRole === 'teacher' || activeRole === 'admin') && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
            Pengaturan Deteksi
          </h2>
          <StruggleConfigPanel />
        </div>
      )}
    </div>
  )
}
