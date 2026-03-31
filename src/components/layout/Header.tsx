import { Activity, Flame, LogOut, Moon, Star, Sun, UserCircle } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { OptimizedImage } from '@/components/ui'
import { Role, useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { LevelBadge } from '@/features/gamification/components/LevelBadge'
import { useStudentXPProfile } from '@/features/gamification/queries/gamificationQueries'
import { NotificationBell as AppNotificationBell } from '@/features/notifications'
import { useStudentProgressData } from '@/features/progress/hooks/useStudentProgressQueries'
import { NotificationBell as StruggleBell } from '@/features/struggle'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'

export const Header = memo(function Header() {
  const { xp } = useStudentProgressData()
  const { data: xpProfile } = useStudentXPProfile()

  const streak = xpProfile?.streak_current ?? 0
  const hasLoggedInToday = streak > 0
  const totalXp = (xpProfile?.total_xp || 0) > 0 ? xpProfile!.total_xp : xp
  const level = (xpProfile?.total_xp || 0) > 0 ? xpProfile!.level : 1
  const xpCurrent = xpProfile?.xp_current_level ?? 0
  const xpNext = xpProfile?.xp_next_level ?? 100
  const xpNeeded = xpNext - xpCurrent
  const progress = xpNeeded > 0 ? Math.min(((totalXp - xpCurrent) / xpNeeded) * 100, 100) : 100

  const { role, profile, signOut } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false)
      }
    }
    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsProfileOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Header] signOut error:', e)
      captureError(e, { context: 'Header.handleLogout' })
    } finally {
      navigate('/login')
    }
  }

  const roleLabels: Record<Role, string> = {
    student: 'Siswa',
    teacher: 'Guru',
    admin: 'Administrator',
  }

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 transition-colors duration-300"
    >
      <div className="flex items-center gap-4 md:hidden">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">E</span>
        </div>
      </div>

      <div className="flex-1 md:flex-none" />

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Streak Indicator */}
        <div className="flex items-center gap-2">
          <Flame
            className={cn(
              'w-6 h-6 transition-all duration-300',
              hasLoggedInToday
                ? 'text-orange-500 fill-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                : 'text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600'
            )}
          />
          <span
            className={cn(
              'font-bold',
              hasLoggedInToday ? 'text-orange-600' : 'text-slate-400 dark:text-slate-500'
            )}
          >
            {streak}
          </span>
        </div>

        {/* Stats/Metrics */}
        <div className="flex items-center gap-3">
          {role === 'teacher' ? (
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold text-sm border border-blue-200/50 dark:border-blue-700/30">
              <Activity className="w-4 h-4" />
              Guru
            </div>
          ) : (
            <>
              <LevelBadge level={level} size="sm" />
              <div className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 text-yellow-700 dark:text-yellow-500 px-2.5 py-1 rounded-lg font-bold text-sm border border-yellow-200/50 dark:border-yellow-700/30">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                {totalXp} XP
              </div>
              <div
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`XP progres: ${progress}%`}
                className="hidden sm:block w-32 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label="Ubah mode gelap"
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-slate-500" />
          )}
        </button>

        {/* Struggle Detection Bell — teacher/admin only */}
        <StruggleBell />

        {/* App Notification Bell — all roles */}
        <AppNotificationBell />

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            data-testid="profile-avatar-button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            aria-label="Menu profil"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <OptimizedImage
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Foto profil pengguna"
              className="w-full h-full object-cover"
            />
          </button>

          {isProfileOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50"
            >
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabels[role]}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    navigate('/profile')
                    setIsProfileOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <UserCircle className="w-4 h-4" />
                  Profil Saya
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
})
