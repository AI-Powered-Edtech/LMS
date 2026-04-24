import { AlertTriangle, BookOpen, Calendar, Eye, Target, Trophy } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'

import { Button, Card } from '@/components/ui'
import { cn } from '@/utils/cn'

interface Assignment {
  id: string
  title: string
  type: string
  status: string
  dueDate: string
}

interface Classroom {
  id: string
  name: string
  schedule?: string
}

interface ImpersonatedStudent {
  name: string
}

interface StudentProgressHeroProps {
  userName: string
  impersonatedStudent?: ImpersonatedStudent | null
  onNavigateBack: () => void
  xp: number
  dailyGoal: number
  assignments: Assignment[]
  classrooms: Classroom[]
  loadingAssignments: boolean
  onJoinClass: () => void
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 10) return '🌅 Selamat pagi'
  if (hour < 14) return '☀️ Selamat siang'
  if (hour < 18) return '🌤️ Selamat sore'
  return '🌙 Selamat malam'
}

export function StudentProgressHero({
  userName,
  impersonatedStudent,
  onNavigateBack,
  xp,
  dailyGoal,
  assignments,
  classrooms,
  loadingAssignments,
  onJoinClass,
}: StudentProgressHeroProps) {
  const navigate = useNavigate()

  const pendingAssignments = assignments
    .filter((a) => a.status === 'assigned' || a.status === 'late')
    .slice(0, 3)

  const progressPercentage = Math.min((xp / dailyGoal) * 100, 100)

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference

  return (
    <div className="space-y-6">
      {/* Impersonation Banner */}
      {impersonatedStudent && (
        <div className="rounded-xl bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center justify-between text-amber-900 dark:text-amber-200 shadow-sm mb-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome & Progress Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-2 relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-8 shadow-xl flex flex-col md:flex-row items-center gap-8"
        >
          {/* Decorative elements */}
          <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />
          
          <div className="relative z-10 flex-1 w-full">
            <p className="text-blue-200 font-medium mb-2 flex items-center gap-2">
              {getGreeting()}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Halo, {userName}!
            </h1>
            <p className="text-blue-100 text-lg mb-6 max-w-md leading-relaxed">
              Lanjutkan petualangan belajarmu. Setiap langkah membawamu lebih dekat ke target!
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Button 
                onClick={() => navigate('/app/student/courses')} 
                className="bg-white text-blue-700 hover:bg-blue-50 border-none font-bold px-6 py-2.5 rounded-xl shadow-md transition-all hover:shadow-lg"
              >
                Mulai Belajar
              </Button>
              <Button 
                variant="secondary" 
                onClick={() => navigate('/app/student/assignments')}
                className="bg-blue-800/30 text-white border-blue-400/30 hover:bg-blue-800/50 hover:text-white font-bold px-6 py-2.5 rounded-xl backdrop-blur-sm transition-all"
              >
                Lihat Tugas
              </Button>
            </div>
          </div>

          {/* Circular Progress Indicator */}
          <div className="relative z-10 flex flex-col items-center justify-center p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10 shadow-inner min-w-[160px]">
            <div className="relative flex items-center justify-center mb-3">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-white/20"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  className="text-amber-400"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Target className="w-6 h-6 text-amber-400 mb-1" />
                <span className="text-2xl font-black">{Math.round(progressPercentage)}%</span>
              </div>
            </div>
            <div className="text-center">
              <p className="text-blue-100 text-sm font-medium">Target Harian</p>
              <p className="text-white font-bold">{xp} / {dailyGoal} XP</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side: Urgent Tasks & Schedule */}
        <div className="flex flex-col gap-6">
          {/* Urgent Tasks */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex-1"
          >
            <Card className="h-full flex flex-col border-orange-100 dark:border-orange-900/30 bg-orange-50/50 dark:bg-orange-900/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Tugas Mendesak
                </h3>
                <Link to="/assignments" className="text-sm font-bold text-orange-600 hover:text-orange-700">
                  Semua
                </Link>
              </div>
              
              {loadingAssignments ? (
                <div className="animate-pulse space-y-3 flex-1">
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              ) : pendingAssignments.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {pendingAssignments.slice(0, 2).map((task) => (
                    <div 
                      key={task.id}
                      onClick={() => navigate('/assignments')}
                      className="group p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-orange-200 shadow-sm cursor-pointer transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 line-clamp-1 group-hover:text-orange-600 transition-colors">
                          {task.title}
                        </p>
                        <div className={cn("w-2 h-2 mt-1 rounded-full shrink-0", task.status === 'late' ? 'bg-red-500 animate-pulse' : 'bg-orange-400')} />
                      </div>
                      <p className={cn("text-xs font-semibold mt-1", task.status === 'late' ? 'text-red-500' : 'text-slate-500')}>
                        {new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2">
                    <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Semua tugas beres!</p>
                  <p className="text-xs text-slate-500 mt-1">Kamu bisa bersantai sekarang.</p>
                </div>
              )}
            </Card>
          </motion.div>

          {/* Schedule */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex-1"
          >
            <Card className="h-full flex flex-col border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Jadwal Kelas
                </h3>
                <button onClick={onJoinClass} className="text-sm font-bold text-blue-600 hover:text-blue-700">
                  Gabung
                </button>
              </div>
              
              {classrooms.length > 0 ? (
                <div className="space-y-3 flex-1">
                  {classrooms.slice(0, 2).map((cls) => (
                    <div key={cls.id} className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                        <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{cls.name}</p>
                        <p className="text-xs text-slate-500 truncate">{cls.schedule || 'Jadwal belum diatur'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Belum ada kelas</p>
                  <p className="text-xs text-slate-500 mt-1">Bergabunglah dengan kelas untuk mulai.</p>
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
