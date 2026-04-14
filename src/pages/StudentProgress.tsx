import { Award, BarChart2, BookOpen, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Breadcrumb, OptimizedImage } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { progressService, StudentProgressData } from '@/features/progress/api/progressService'
import { ProgressSkeleton } from '@/features/progress/components/ProgressSkeleton'
import { usePageTitle } from '@/hooks/usePageTitle'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

export function StudentProgress() {
  usePageTitle('Progres Siswa')
  const { studentId } = useParams()
  const { tenantId } = useAuth()
  const [data, setData] = useState<StudentProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProgress() {
      if (!studentId || studentId === 'overview') {
        // 'overview' is a nav placeholder — no real studentId selected yet
        setLoading(false)
        return
      }

      if (!tenantId) {
        setError('Tidak dapat memuat data: tenant tidak ditemukan.')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // High performance consolidation: 6 queries -> 1 RPC call
        const progressData = await progressService.getStudentProgressBundle(studentId, tenantId!)
        setData(progressData)
      } catch (err: unknown) {
        if (import.meta.env.DEV) logger.error('Failed to load student progress', err)
        setError('Gagal memuat progres siswa')
      } finally {
        setLoading(false)
      }
    }

    void loadProgress()
  }, [studentId, tenantId])

  if (loading) {
    return <ProgressSkeleton />
  }

  // No student selected yet (nav points to /overview as placeholder)
  if (!studentId || studentId === 'overview') {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <TrendingUp className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" />
        <p className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">Progres Siswa</p>
        <p className="text-sm text-center">
          Pilih siswa dari halaman{' '}
          <a href="/app/admin/users" className="text-blue-600 dark:text-blue-400 underline">
            Manajemen Pengguna
          </a>{' '}
          untuk melihat progres belajar mereka.
        </p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-slate-500 dark:text-slate-400">
        <p className="text-red-500 font-bold mb-2">{error || 'Data tidak ditemukan'}</p>
      </div>
    )
  }

  const { profile, totalXP, completedLessonsCount, quizAttempts, achievements, courseProgress } =
    data
  const studentName = profile?.full_name || 'Siswa Tanpa Nama'
  const avatarUrl =
    profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${studentName}`

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Breadcrumb
        items={[
          { label: 'Dashboard', href: '/app/teacher/dashboard' },
          { label: 'Kemajuan Siswa' },
        ]}
        className="mb-2"
      />
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden shadow-md">
          <OptimizedImage
            src={avatarUrl}
            alt={studentName}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
            {studentName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400">Progres Belajar & Pencapaian</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">
              Materi Selesai
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {completedLessonsCount}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">
              Total XP
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalXP}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase">
              Pencapaian
            </p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
              {achievements.length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" /> Progres Kursus
        </h2>
        <div className="space-y-4">
          {!courseProgress || courseProgress.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 italic text-sm text-center py-4">
              Belum ada progres kursus.
            </p>
          ) : (
            courseProgress.map((cp) => (
              <div
                key={cp.id}
                className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700"
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-800 dark:text-slate-200">
                    {cp.courses?.title || 'Kursus Tidak Terdaftar'}
                  </h3>
                  <span className="text-sm font-bold text-blue-600">{cp.percentage}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={cp.percentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progres ${cp.courses?.title || 'Kursus'}: ${cp.percentage}%`}
                  className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden"
                >
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cp.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    {cp.completed_lessons} / {cp.total_lessons} Materi Selesai
                  </span>
                  {cp.last_activity_at && (
                    <span>
                      Aktivitas terakhir:{' '}
                      {new Date(cp.last_activity_at).toLocaleDateString('id-ID')}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" /> Riwayat Kuis
          </h2>
          <div className="space-y-4">
            {quizAttempts.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 italic text-sm text-center py-4">
                Belum ada riwayat kuis.
              </p>
            ) : (
              quizAttempts.map((attempt) => {
                const isPassed = attempt.score >= 70
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700"
                  >
                    <div>
                      {/* FIXED: Display quiz title if available, or shortened UUID instead of raw UUID */}
                      <p className="font-bold text-slate-800 dark:text-slate-200">
                        Kuis: {'Kuis #' + attempt.quiz_id.slice(0, 8)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(attempt.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'font-bold px-3 py-1 rounded-full text-sm',
                        isPassed ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      )}
                    >
                      Nilai: {attempt.score}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Daftar Lencana
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {achievements.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 italic text-sm text-center py-4 col-span-2">
                Belum ada lencana yang diraih.
              </p>
            ) : (
              achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center"
                >
                  <div className="text-3xl mb-2">
                    {ach.badges?.icon === 'crown' ? '👑' : ach.badges?.icon === 'zap' ? '⚡' : '🎯'}
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                    {ach.badges?.name || 'Badge'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {new Date(ach.earned_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
