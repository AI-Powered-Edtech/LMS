import { useTheme } from '@/src/contexts/ThemeContext'

export function HeaderSkeleton() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const pulse = isDark ? 'bg-slate-700' : 'bg-slate-200'

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8">
      {/* Mobile logo placeholder */}
      <div className="flex items-center gap-4 md:hidden">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">E</span>
        </div>
      </div>

      <div className="flex-1 md:flex-none" />

      {/* Right side skeleton */}
      <div className="flex items-center gap-4 sm:gap-6">
        {/* Streak skeleton */}
        <div className={`w-12 h-6 rounded-lg animate-pulse ${pulse}`} />
        {/* XP skeleton */}
        <div
          className={`w-16 h-6 rounded-lg animate-pulse ${pulse}`}
          style={{ animationDelay: '100ms' }}
        />
        {/* Notification bell skeleton */}
        <div
          className={`w-9 h-9 rounded-full animate-pulse ${pulse}`}
          style={{ animationDelay: '200ms' }}
        />
        {/* Avatar skeleton */}
        <div
          className={`w-9 h-9 rounded-full animate-pulse ${pulse}`}
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </header>
  )
}
