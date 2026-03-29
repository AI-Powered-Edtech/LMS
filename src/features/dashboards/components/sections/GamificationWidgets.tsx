// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import { Clock, Crown, Star, Target, Trophy, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { Card, EmptyState } from '@/src/components/ui'
import { cn } from '@/src/utils/cn'

interface Achievement {
  id: string
  title: string
  icon: string
}

interface GamificationWidgetsProps {
  xp: number
  dailyGoal: number
  achievements: Achievement[]
}

const WEEKDAYS = ['Kam', 'Jum', 'Sab', 'Min', 'Sen', 'Sel', 'Rab'] as const

function getAchievementIcon(iconName: string) {
  switch (iconName) {
    case 'crown':
      return Crown
    case 'zap':
      return Zap
    case 'target':
      return Target
    default:
      return Star
  }
}

function getAchievementColors(iconName: string) {
  switch (iconName) {
    case 'crown':
      return {
        icon: 'text-yellow-600 fill-yellow-500',
        bg: 'bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600',
      }
    case 'zap':
      return {
        icon: 'text-slate-400 fill-slate-400 dark:text-slate-500 dark:fill-slate-500',
        bg: 'bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-600',
      }
    case 'target':
      return {
        icon: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600',
      }
    default:
      return {
        icon: 'text-yellow-500 dark:text-yellow-400',
        bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700',
      }
  }
}

export function GamificationWidgets({ xp, dailyGoal, achievements }: GamificationWidgetsProps) {
  const navigate = useNavigate()
  const dailyProgress = Math.min(100, ((xp % dailyGoal) / dailyGoal) * 100)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8">
      {/* XP Progress */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Progres XP</h3>
        </div>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 flex items-center justify-center shrink-0">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-end mb-1">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Target Harian
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
                {xp % dailyGoal}/{dailyGoal} XP
              </span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${dailyProgress}%` }}
              />
            </div>
          </div>
        </div>
        <div className="h-24 flex items-end justify-between gap-1 pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
          {WEEKDAYS.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-full bg-yellow-100 dark:bg-yellow-900/30 rounded-t-sm"
                style={{ height: '25%' }}
              />
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                {day}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Achievements */}
      <Card>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-900 dark:text-white">Pencapaian</h3>
        </div>
        {achievements.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 mt-auto">
            {achievements.slice(0, 3).map((achievement) => {
              const Icon = getAchievementIcon(achievement.icon)
              const colors = getAchievementColors(achievement.icon)
              return (
                <div key={achievement.id} className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-inner',
                      colors.bg
                    )}
                  >
                    <Icon className={cn('w-7 h-7', colors.icon)} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center leading-tight">
                    {achievement.title}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={<Star className="w-8 h-8" />} title="Belum ada pencapaian" />
        )}
      </Card>

      {/* Quiz Progress */}
      <Card>
        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Progres Kuis</h3>
        <EmptyState
          icon={<Clock className="w-8 h-8" />}
          title="Belum ada riwayat kuis"
          action={{ label: 'Mulai Kuis', onClick: () => navigate('/quiz') }}
        />
      </Card>
    </div>
  )
}
