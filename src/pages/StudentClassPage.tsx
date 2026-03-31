import { ArrowLeft, BookOpen, GraduationCap, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { Course, courseService } from '@/features/courses'
import { usePageTitle } from '@/hooks/usePageTitle'
import { captureError } from '@/utils/sentry'

export function StudentClassPage() {
  usePageTitle('Halaman Kelas Siswa')
  const { classId } = useParams()
  const navigate = useNavigate()
  const { classrooms } = useClassroom()
  const { tenantId } = useAuth()

  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  const currentClass = classrooms.find((c) => c.id === classId)

  useEffect(() => {
    async function loadClassData() {
      if (!tenantId || !classId) return
      try {
        setLoading(true)
        const { courses } = await courseService.fetchCourses({ tenantId, limit: 100 })
        const classCourses = courses.filter((course) =>
          course.assigned_classes?.some((ac: { class_id: string }) => ac.class_id === classId)
        )
        setCourses(classCourses)
      } catch (err) {
        if (import.meta.env.DEV) console.error('Failed to load class courses:', err)
        captureError(err, { context: 'StudentClassPage.loadClassData' })
      } finally {
        setLoading(false)
      }
    }

    if (currentClass) {
      loadClassData()
    }
  }, [classId, tenantId, currentClass])

  if (!currentClass) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <GraduationCap className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
          Kelas tidak ditemukan
        </h2>
        <button
          onClick={() => navigate('/dashboard')}
          className="mt-4 text-indigo-600 font-bold hover:underline"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8 pb-20">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-600 dark:text-slate-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              {currentClass.name}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 font-medium">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md text-xs">
                {currentClass.teacher_name || 'Guru'}
              </span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Courses / Materi */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-indigo-500" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                Materi Pembelajaran
              </h2>
            </div>

            {loading ? (
              <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              </div>
            ) : courses.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-300 text-slate-500 dark:text-slate-400">
                Belum ada materi untuk kelas ini.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/courses/${course.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') navigate(`/courses/${course.id}`)
                    }}
                    className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex items-start gap-4"
                  >
                    <div className="w-16 h-16 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Play className="w-8 h-8 ml-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {course.description || 'Tidak ada deskripsi'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
