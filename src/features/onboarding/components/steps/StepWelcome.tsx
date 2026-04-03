import { BookOpen, ChevronRight, GraduationCap, School, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/utils/cn'

interface StepWelcomeProps {
  onNext: () => void
}

/**
 * Step 1: Welcome — halaman pembuka onboarding guru baru.
 * Menjelaskan manfaat dan alur setup.
 */
export function StepWelcome({ onNext }: StepWelcomeProps) {
  const { profile } = useAuth()
  const firstName = profile?.first_name || 'Guru'

  return (
    <div className="flex flex-col items-center text-center py-4">
      <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-lg mb-6">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-3">
        Selamat Datang di EduSync! 🎉
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm mb-2">
        Halo, <span className="font-semibold text-slate-700 dark:text-slate-200">{firstName}</span>!
        Kami akan membantu Anda memulai perjalanan mengajar digital dalam beberapa langkah mudah.
      </p>
      <p className="text-slate-400 dark:text-slate-500 text-xs mb-8">
        Proses ini hanya memakan waktu sekitar 2 menit.
      </p>
      <div className="grid grid-cols-3 gap-4 w-full mb-8">
        {[
          {
            icon: <School className="w-5 h-5" />,
            label: 'Buat Kelas',
            color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30',
          },
          {
            icon: <GraduationCap className="w-5 h-5" />,
            label: 'Undang Siswa',
            color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
          },
          {
            icon: <BookOpen className="w-5 h-5" />,
            label: 'Buat Materi',
            color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30',
          },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-2">
            <div
              className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', item.color)}
            >
              {item.icon}
            </div>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
              {item.label}
            </span>
          </div>
        ))}
      </div>
      <Button
        size="lg"
        fullWidth
        onClick={onNext}
        className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white border-0"
      >
        Mulai Pengaturan
        <ChevronRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  )
}
