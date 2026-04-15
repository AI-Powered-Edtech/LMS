import { BookOpen, Eye, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button, Card } from '@/components/ui'
import { StreakCounter } from '@/features/gamification/components/StreakCounter'
import { XPProgressBar } from '@/features/gamification/components/XPProgressBar'

interface ImpersonatedStudent {
  name: string
}

interface WelcomeCardProps {
  userName: string
  role: string
  impersonatedStudent?: ImpersonatedStudent | null
  onNavigateBack: () => void
  xp: number
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 10) return '🌅 Selamat pagi'
  if (hour < 14) return '☀️ Selamat siang'
  if (hour < 18) return '🌤️ Selamat sore'
  return '🌙 Selamat malam'
}

function getMotivationalText(xp: number): string {
  if (xp === 0) return 'Mulai belajar untuk kumpulkan XP pertamamu!'
  if (xp < 50) return 'Terus semangat! Kamu baru mulai perjalananmu.'
  if (xp < 200) return 'Bagus! Terus kumpulkan XP dan raih level berikutnya.'
  return 'Luar biasa! Kamu sudah jadi pelajar sejati!'
}

export function WelcomeCard({
  userName,
  role,
  impersonatedStudent,
  onNavigateBack,
  xp,
}: WelcomeCardProps) {
  return (
    <>
      {/* Impersonation Banner */}
      {impersonatedStudent && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-100 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center justify-between text-amber-900 dark:text-amber-200 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4" />
            <span>
              Melihat sebagai <span className="font-bold">{impersonatedStudent.name}</span>
            </span>
          </div>
          <Button variant="ghost" size="sm" onClick={onNavigateBack}>
            Keluar Tampilan Siswa
          </Button>
        </div>
      )}

      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 dark:from-blue-700 dark:via-blue-800 dark:to-indigo-900 p-6 sm:p-8 shadow-lg">
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/5" />
        <div className="relative z-10">
          <p className="text-blue-200 text-sm font-medium mb-1">{getGreeting()}</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">{userName}!</h1>
          <p className="text-blue-200 text-sm sm:text-base">
            Siap untuk melanjutkan petualangan belajarmu hari ini?
          </p>
          {role === 'teacher' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mt-4">
              <Link
                to="/app/teacher/teaching-hub"
                className="inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors backdrop-blur-sm"
              >
                <BookOpen className="w-4 h-4" />
                Kelola Materi
              </Link>
              <Link
                to="/assignments"
                className="inline-flex items-center gap-2 bg-white text-blue-700 text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Buat Tugas
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Streak & XP Motivational Card (Student Only) */}
      {role === 'student' && (
        <Card padding="sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 flex items-center gap-4">
              <StreakCounter compact />
              <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 shrink-0" />
              <XPProgressBar compact />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              {getMotivationalText(xp)}
            </p>
          </div>
        </Card>
      )}
    </>
  )
}
