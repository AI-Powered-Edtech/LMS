import { useTheme } from "@/src/contexts/ThemeContext";

export function SidebarSkeleton() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          EduSync
        </h1>
      </div>

      {/* Nav skeleton items */}
      <nav className="flex-1 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-2xl">
            <div className={`w-5 h-5 rounded-md animate-pulse ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
            <div
              className={`h-4 rounded-lg animate-pulse ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}
              style={{ width: `${60 + Math.random() * 40}%`, animationDelay: `${i * 100}ms` }}
            />
          </div>
        ))}
      </nav>

      {/* Bottom skeleton */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <div className={`h-10 rounded-xl animate-pulse ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`} />
      </div>
    </aside>
  );
}
