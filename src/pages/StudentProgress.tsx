import { OptimizedImage } from '@/src/components/ui'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { progressService, StudentProgressData } from '@/src/features/progress/api/progressService'
import { Award, TrendingUp, BookOpen, BarChart2 } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { ProgressSkeleton } from '@/src/features/progress/components/ProgressSkeleton'

export function StudentProgress() {
  usePageTitle('Student Progress')
  const { studentId } = useParams()
  const [data, setData] = useState<StudentProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProgress() {
      if (!studentId) {
        setError('ID Siswa tidak ditemukan')
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // High performance consolidation: 6 queries -> 1 RPC call
        const progressData = await progressService.getStudentProgressBundle(studentId)
        setData(progressData)
      } catch (err: unknown) {
        if (import.meta.env.DEV) console.error('Failed to load student progress', err)
        setError('Gagal memuat progres siswa')
      } finally {
        setLoading(false)
      }
    }

    loadProgress()
  }, [studentId])

  if (loading) {
    return <ProgressSkeleton />
  }

  if (error || !data) {
    return (
      <div className="flex-1 w-full flex flex-col items-center justify-center p-12 text-slate-500">
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
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-slate-200 rounded-full overflow-hidden shadow-md">
          <OptimizedImage
            src={avatarUrl}
            alt={studentName}
            className="w-full h-full object-cover"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{studentName}</h1>
          <p className="text-slate-500">Progres Belajar & Pencapaian</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Materi Selesai</p>
            <p className="text-2xl font-black text-slate-900">{completedLessonsCount}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Total XP</p>
            <p className="text-2xl font-black text-slate-900">{totalXP}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase">Pencapaian</p>
            <p className="text-2xl font-black text-slate-900">{achievements.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-600" /> Progres Kursus
        </h2>
        <div className="space-y-4">
          {!courseProgress || courseProgress.length === 0 ? (
            <p className="text-slate-500 italic text-sm text-center py-4">
              Belum ada progres kursus.
            </p>
          ) : (
            courseProgress.map((cp) => (
              <div key={cp.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-slate-800">
                    {cp.courses?.title || 'Kursus Tidak Terdaftar'}
                  </h3>
                  <span className="text-sm font-bold text-blue-600">{cp.percentage}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5 mb-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(cp.percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
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
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-blue-600" /> Riwayat Kuis
          </h2>
          <div className="space-y-4">
            {quizAttempts.length === 0 ? (
              <p className="text-slate-500 italic text-sm text-center py-4">
                Belum ada riwayat kuis.
              </p>
            ) : (
              quizAttempts.map((attempt) => {
                const isPassed = attempt.score >= 70 // Assuming 70 is passing score
                return (
                  <div
                    key={attempt.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <div>
                      <p className="font-bold text-slate-800">Kuis: {attempt.quiz_id}</p>
                      <p className="text-xs text-slate-500">
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

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" /> Daftar Lencana
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {achievements.length === 0 ? (
              <p className="text-slate-500 italic text-sm text-center py-4 col-span-2">
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
                  <p className="font-bold text-slate-800 text-sm">{ach.badges?.name || 'Badge'}</p>
                  <p className="text-xs text-slate-500 mt-1">
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
