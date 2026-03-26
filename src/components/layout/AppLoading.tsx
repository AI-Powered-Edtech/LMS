import { useTheme } from '@/src/contexts/ThemeContext'

import { HeaderSkeleton } from './HeaderSkeleton'
import { SidebarSkeleton } from './SidebarSkeleton'

/**
 * App Shell loading state that mirrors the real app layout.
 * Displays sidebar + header skeletons instead of a full-screen spinner.
 */
export function AppLoading() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const pulse = isDark ? 'bg-slate-700' : 'bg-slate-200'

  return (
    <div
      className={`flex h-[100dvh] overflow-hidden font-sans flex-col transition-colors duration-300 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}
    >
      <div className="flex-1 flex overflow-hidden relative">
        <SidebarSkeleton />
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          <HeaderSkeleton />
          <main className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col p-2 sm:p-4 md:p-8">
            <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col gap-6">
              {/* Page title skeleton */}
              <div className={`h-8 w-48 rounded-lg animate-pulse ${pulse}`} />

              {/* Card skeletons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-2xl p-6 space-y-4 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}
                  >
                    <div
                      className={`h-4 w-3/4 rounded-lg animate-pulse ${pulse}`}
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                    <div
                      className={`h-3 w-full rounded-lg animate-pulse ${pulse}`}
                      style={{ animationDelay: `${i * 150 + 50}ms` }}
                    />
                    <div
                      className={`h-3 w-5/6 rounded-lg animate-pulse ${pulse}`}
                      style={{ animationDelay: `${i * 150 + 100}ms` }}
                    />
                  </div>
                ))}
              </div>

              {/* Content block skeleton */}
              <div
                className={`rounded-2xl p-6 space-y-3 ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-slate-200'}`}
              >
                <div className={`h-5 w-1/3 rounded-lg animate-pulse ${pulse}`} />
                <div className={`h-3 w-full rounded-lg animate-pulse ${pulse}`} />
                <div className={`h-3 w-4/5 rounded-lg animate-pulse ${pulse}`} />
                <div className={`h-3 w-2/3 rounded-lg animate-pulse ${pulse}`} />
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
