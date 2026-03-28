import { ArrowRight, BookOpen, Play } from 'lucide-react'
import { motion } from 'motion/react'
import { useNavigate } from 'react-router-dom'

import { Badge, Card, EmptyState, SkeletonCard } from '@/src/components/ui'

interface CourseItem {
  id: string
  title?: string
  description?: string
  status?: string
  progress_pct?: number
  progress?: number
  completed_lessons?: number
  total_lessons?: number
}

interface ContinueLearningProps {
  courses: CourseItem[]
  loading: boolean
  onJoinClass: () => void
}

function CourseProgressBar({ course }: { course: CourseItem }) {
  const pct =
    typeof course.progress_pct === 'number'
      ? course.progress_pct
      : typeof course.progress === 'number'
        ? course.progress
        : 0
  const completed = course.completed_lessons ?? 0
  const total = course.total_lessons ?? 0

  return (
    <>
      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-1">
        {total > 0
          ? `${completed}/${total} Pelajaran`
          : pct > 0
            ? `${pct}% Selesai`
            : 'Mulai Belajar'}
      </p>
    </>
  )
}

export function ContinueLearning({ courses, loading, onJoinClass }: ContinueLearningProps) {
  const navigate = useNavigate()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Play className="w-5 h-5 text-indigo-500" />
          Lanjutkan Belajar
        </h2>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : courses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {courses.slice(0, 4).map((course) => (
            <motion.div key={course.id} whileHover={{ y: -4 }}>
              <Card hover onClick={() => navigate(`/app/student/courses/${course.id}`)}>
                <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 flex items-center justify-center overflow-hidden relative group/thumb">
                  <BookOpen className="w-10 h-10 text-white/50" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent py-2 px-3 flex items-center justify-between opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-bold tracking-wide">Lanjutkan</span>
                    <Play className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-white line-clamp-1 mb-1">
                  {course.title}
                </h3>
                <div className="mt-2 mb-2">
                  <CourseProgressBar course={course} />
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="success" size="sm">
                    AKTIF
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={<BookOpen className="w-12 h-12" />}
            title="Belum ada materi"
            description="Gabung ke kelas untuk mulai belajar."
            action={{ label: 'Gabung Kelas', onClick: onJoinClass }}
          />
        </Card>
      )}
    </div>
  )
}
