import { BookOpen, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { courseService } from '@/src/features/courses/api/courseService'
import { translateCourseStatus } from '@/src/utils/statusTranslations'

interface Course {
  id: string
  title: string
  description?: string
  status: string
  profiles?: { full_name: string }
}

export function StudentCoursesList() {
  const navigate = useNavigate()
  const { tenantId } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    setLoading(true)
    courseService
      .fetchCourses({ tenantId, limit: 50 })
      .then((res) => {
        // Filter out drafts if necessary, though fetchCourses might handle it
        setCourses(
          (res.courses as unknown as Course[]).filter(
            (c) => c.status === 'published' || c.status === 'active'
          )
        )
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tenantId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 dark:from-slate-900 dark:via-blue-900/10 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Pilih Materi / Kursus
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
            Jelajahi dan pilih materi yang tersedia untuk Anda pelajari.
          </p>
        </div>

        {courses.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">
              Belum Ada Kursus
            </h2>
            <p className="text-slate-500">
              Belum ada kursus aktif yang tersedia di sistem saat ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course.id}
                onClick={() => navigate(`/app/student/courses/${course.id}`)}
                className="group flex flex-col bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all cursor-pointer"
              >
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  {course.description && (
                    <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-3 mb-4 flex-1">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <User className="w-4 h-4" />
                      Pengajar: {course.profiles?.full_name || 'Teacher Dev'}
                    </div>
                    <span className="text-xs font-bold px-2 py-1 rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase">
                      {translateCourseStatus(course.status)}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700/50 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                  <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-none">
                    Mulai Belajar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
