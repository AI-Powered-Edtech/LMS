import { BarChart3, BookOpen, Check, ClipboardCheck, Rocket } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

interface StepReadyProps {
  completedSteps: number[]
  createdClassId: string | null
  createdCourseId: string | null
  onFinish: () => void
}

/**
 * Step 5 — Siap Mengajar: konfirmasi setup selesai dan tampilkan langkah selanjutnya.
 */
export function StepReady({
  completedSteps,
  createdClassId,
  createdCourseId,
  onFinish,
}: StepReadyProps) {
  const navigate = useNavigate()

  const checklistItems = [
    {
      label: 'Kelas dibuat',
      done: completedSteps.includes(2) || !!createdClassId,
    },
    {
      label: 'Siswa diundang',
      done: completedSteps.includes(3),
    },
    {
      label: 'Materi ditambahkan',
      done: completedSteps.includes(4) || !!createdCourseId,
    },
  ]

  const nextSteps = [
    {
      icon: <ClipboardCheck className="w-5 h-5 text-violet-500" />,
      label: 'Buat Kuis',
      path: '/app/teacher/quiz-manager',
      bg: 'bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800/40',
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-blue-500" />,
      label: 'Lihat Analitik',
      path: '/analytics',
      bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/40',
    },
    {
      icon: <BookOpen className="w-5 h-5 text-amber-500" />,
      label: 'Koreksi Tugas',
      path: '/grader',
      bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/40',
    },
    {
      icon: <Rocket className="w-5 h-5 text-emerald-500" />,
      label: 'Eksplorasi Fitur',
      path: '/app/teacher/teaching-hub',
      bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40',
    },
  ]

  return (
    <div className="py-2">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4">
          <Rocket className="w-8 h-8 text-white" />
        </div>
        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-1">
          Anda Siap Mengajar! 🚀
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          EduSync sudah dikonfigurasi untuk Anda.
        </p>
      </div>

      <div className="space-y-2 mb-6">
        {checklistItems.map((item) => (
          <div
            key={item.label}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border',
              item.done
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'
            )}
          >
            <div
              className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                item.done
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-400'
              )}
            >
              {item.done ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
              )}
            </div>
            <span
              className={cn(
                'text-sm font-medium',
                item.done
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-slate-500 dark:text-slate-400'
              )}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
        Langkah Selanjutnya
      </p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {nextSteps.map((item) => (
          <button
            key={item.path}
            onClick={() => {
              onFinish()
              setTimeout(() => navigate(item.path), 300)
            }}
            className={cn(
              'flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98]',
              item.bg
            )}
          >
            {item.icon}
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {item.label}
            </span>
          </button>
        ))}
      </div>

      <Button
        size="lg"
        fullWidth
        onClick={onFinish}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white border-0"
      >
        Mulai Mengajar!
      </Button>
    </div>
  )
}
