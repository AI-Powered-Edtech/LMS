import { AlertTriangle, BookOpen } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import {
  CourseHeader,
  ModuleList,
  type ModuleWithProgress,
  ProgressSummary,
} from '@/src/components/CourseOverview'
import { useAuth } from '@/src/contexts/AuthContext'
import { courseService } from '@/src/features/courses'
import { lessonService } from '@/src/features/lessons/api/lessonService'
import { LessonSkeleton } from '@/src/features/lessons/components/LessonSkeleton'
import { cn } from '@/src/utils/cn'

// ============================================================
// Types
// ============================================================

interface CourseData {
  id: string
  title: string
  description: string | null
  created_by: string
}

// ============================================================
// CourseBrowser — shown when no moduleId param is selected
// ============================================================

export function CourseBrowser({
  onSelectModule,
  tenantId,
  courseId,
}: {
  onSelectModule: (moduleId: string) => void
  tenantId: string
  courseId?: string
}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [course, setCourse] = useState<CourseData | null>(null)
  const [modules, setModules] = useState<ModuleWithProgress[]>([])
  const [totalLessons, setTotalLessons] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(0)
  const [totalDuration, setTotalDuration] = useState(0)
  const [instructorName, setInstructorName] = useState<string | undefined>()
  const [nextIncompleteModuleId, setNextIncompleteModuleId] = useState<string | undefined>()

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    setFetchError(null)
    ;(async () => {
      try {
        // 1. Fetch course
        const { courses: coursesData } = await courseService.fetchCourses({
          tenantId,
          limit: 100,
          ids: courseId ? [courseId] : undefined,
        })

        if (!coursesData?.length) {
          setLoading(false)
          return
        }

        const activeCourse = coursesData[0]
        setCourse({
          id: activeCourse.id,
          title: activeCourse.title,
          description: activeCourse.description,
          created_by: activeCourse.created_by,
        })

        // 2+5. Fetch modules and instructor profile in parallel
        const [modulesData, teacherName] = await Promise.all([
          courseService.getCourseModulesWithLessons(activeCourse.id, tenantId),
          courseService.getTeacherName(activeCourse.created_by),
        ])

        if (teacherName) setInstructorName(teacherName)

        if (!modulesData.length) {
          setModules([])
          setLoading(false)
          return
        }

        // 3. Fetch lesson progress (needs lesson IDs from modules)
        const allLessonIds = (modulesData as Array<{ lessons?: Array<{ id: string }> }>).flatMap(
          (m) => (m.lessons || []).map((l) => l.id)
        )

        const completedSet = await lessonService.getCompletedLessonIds(user.id, allLessonIds)

        // 4. Build module progress data
        let totalL = 0
        let completedL = 0
        let totalDur = 0
        let foundNextIncomplete = false

        interface ModuleRow {
          id: string
          title: string
          order: number
          lessons: Array<{
            id: string
            title: string
            type: string
            order: number
            duration_minutes?: number
          }>
        }
        const modulesWithProgress: ModuleWithProgress[] = (
          modulesData as unknown as ModuleRow[]
        ).map((m) => {
          const lessons = m.lessons || []
          const lessonCount = lessons.length
          const completedCount = lessons.filter((l) => completedSet.has(l.id)).length
          const duration = lessons.reduce(
            (sum: number, l: { duration_minutes?: number }) => sum + (l.duration_minutes || 5),
            0
          )

          totalL += lessonCount
          completedL += completedCount
          totalDur += duration

          if (!foundNextIncomplete && completedCount < lessonCount) {
            setNextIncompleteModuleId(m.id)
            foundNextIncomplete = true
          }

          return {
            id: m.id,
            title: m.title,
            order: m.order,
            lessonCount,
            completedLessons: completedCount,
            durationMinutes: duration,
          }
        })

        setModules(modulesWithProgress)
        setTotalLessons(totalL)
        setCompletedLessons(completedL)
        setTotalDuration(totalDur)
      } catch (err) {
        if (import.meta.env.DEV) console.error('[CourseBrowser] fetch failed:', err)
        setFetchError('Gagal memuat materi. Periksa koneksi internet kamu dan coba lagi.')
      } finally {
        setLoading(false)
      }
    })()
  }, [tenantId, courseId, user?.id, retryCount])

  const handleContinueLearning = useCallback(() => {
    if (nextIncompleteModuleId) {
      onSelectModule(nextIncompleteModuleId)
    } else if (modules.length > 0) {
      // All complete or no progress — go to first module
      onSelectModule(modules[0].id)
    }
  }, [nextIncompleteModuleId, modules, onSelectModule])

  if (loading) {
    return <LessonSkeleton />
  }

  if (fetchError) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center p-8 max-w-sm">
          <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-10 h-10 text-red-400 dark:text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-100 mb-2">
            Gagal Memuat Materi
          </h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-5">{fetchError}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center p-8">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-5">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-100 mb-2">
            Belum Ada Materi
          </h2>
          <p className="text-slate-400 dark:text-slate-500">
            Kursus dan modul akan muncul di sini setelah guru membuatnya.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-900/10 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <CourseHeader
          course={course}
          instructorName={instructorName}
          onContinueLearning={handleContinueLearning}
          hasProgress={completedLessons > 0}
        />

        {totalLessons > 0 && (
          <ProgressSummary
            totalLessons={totalLessons}
            completedLessons={completedLessons}
            totalDurationMinutes={totalDuration}
          />
        )}

        {/* B7: Certificate Preview Motivator */}
        {totalLessons > 0 && (
          <div
            className={cn(
              'flex items-center gap-4 p-4 rounded-2xl border',
              completedLessons === totalLessons
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-800'
            )}
          >
            <span className="text-3xl shrink-0">
              {completedLessons === totalLessons ? '🎓' : '🎓'}
            </span>
            <div className="flex-1">
              {completedLessons === totalLessons ? (
                <>
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Sertifikat tersedia!</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Lihat dan unduh sertifikat kamu di halaman{' '}
                    <Link to="/profile" className="font-bold underline">
                      Profil
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <p className="font-bold text-indigo-800 dark:text-indigo-300 text-sm">
                    Selesaikan course ini untuk mendapat Sertifikat!
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
                    {totalLessons - completedLessons} pelajaran lagi menuju sertifikatmu
                  </p>
                </>
              )}
            </div>
            {/* B8: XP Breakdown Preview */}
            <div className="shrink-0 text-right">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Estimasi XP</p>
              <p className="text-sm font-bold text-yellow-600 dark:text-yellow-500">~{totalLessons * 10} XP</p>
            </div>
          </div>
        )}

        {modules.length > 0 ? (
          <ModuleList
            modules={modules}
            onSelectModule={onSelectModule}
            nextIncompleteModuleId={nextIncompleteModuleId}
          />
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-md shadow-slate-200/40 dark:shadow-none p-8 text-center">
            <p className="text-slate-400 dark:text-slate-500 text-sm">Belum ada modul dalam kursus ini.</p>
          </div>
        )}
      </div>
    </div>
  )
}
