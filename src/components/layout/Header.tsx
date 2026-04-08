import { Activity, Flame, LogOut, Moon, Search, Star, Sun, UserCircle } from 'lucide-react'
import { memo, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { OptimizedImage } from '@/components/ui'
import { Role, useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { LevelBadge } from '@/features/gamification/components/LevelBadge'
import { useHeaderXPData } from '@/features/gamification/hooks/useHeaderXPData'
import {
  AdminNotificationBell,
  NotificationBell as AppNotificationBell,
} from '@/features/notifications'
import { GlobalSearchModal } from '@/features/search'
import { NotificationBell as StruggleBell } from '@/features/struggle'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'

interface HeaderProps {
  onMenuClick?: () => void
}

export const Header = memo(function Header({ onMenuClick }: HeaderProps) {
  // PERF: XP data di-fetch hanya untuk student (dihandle oleh useHeaderXPData).
  // Teacher dan admin tidak membayar query student-specific.
  const { streak, hasLoggedInToday, totalXp, level, progress } = useHeaderXPData()

  const { role, profile, signOut, user } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (e) {
      if (import.meta.env.DEV) console.error('[Header] signOut error:', e)
      captureError(e, { context: 'Header.handleLogout' })
    } finally {
      void navigate('/login')
    }
  }

  const roleLabels: Record<Role, string> = {
    student: 'Siswa',
    teacher: 'Guru',
    admin: 'Administrator',
    parent: 'Orang Tua',
    principal: 'Kepala Sekolah',
  }

  const isStudent = role === 'student'

  return (
    <header
      data-testid="navbar"
      className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 transition-colors duration-300"
    >
      <div className="flex items-center gap-4 md:hidden">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            aria-label="Buka menu"
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">E</span>
        </div>
      </div>

      {/* Global Search Trigger */}
      <button
        onClick={() => setIsSearchOpen(true)}
        className="flex-1 md:flex-none flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm text-slate-500 dark:text-slate-400 max-w-xs"
        aria-label="Buka pencarian global"
      >
        <Search className="w-4 h-4" />
        <span className="hidden md:inline">Cari...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 ml-auto text-xs">
          <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">⌘K</span>
        </kbd>
      </button>

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Role-aware Stats Area — hanya student yang menampilkan XP/streak */}
        {isStudent ? (
          <>
            {/* Streak Indicator — student only */}
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

            {/* XP Stats — student only */}
            <div className="flex items-center gap-3">
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
            </div>
          </>
        ) : (
          /* Role badge untuk non-student (teacher, admin) */
          <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold text-sm border border-blue-200/50 dark:border-blue-700/30">
            <Activity className="w-4 h-4" />
            {roleLabels[role]}
          </div>
        )}

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

        {/* Admin Notification Center — admin only */}
        {role === 'admin' && <AdminNotificationBell />}

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
              src={
                profile?.avatar_url ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.first_name || user?.id}`
              }
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
                    void navigate('/profile')
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
                  onClick={() => {
                    void handleLogout()
                  }}
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
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  )
})
