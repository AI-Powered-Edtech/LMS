import {
  Building2,
  Calendar as CalendarIcon,
  FolderKanban,
  GraduationCap,
  HelpCircle,
  Home,
  LayoutGrid,
  Megaphone,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { cn } from '@/src/utils/cn'

const navItems = [
  // Teacher Primary
  { name: 'Dasbor', path: '/app/teacher/dashboard', icon: GraduationCap, roles: ['teacher'] },

  // Student Primary
  { name: 'Beranda', path: '/app/student/dashboard', icon: Home, roles: ['student'] },
  { name: 'Kuis', path: '/app/student/quizzes', icon: HelpCircle, roles: ['student'] },

  // Admin Primary
  { name: 'Dasbor', path: '/app/admin/dashboard', icon: Building2, roles: ['admin'] },

  // Shared Primary
  { name: 'Tugas', path: '/assignments', icon: FolderKanban, roles: ['teacher', 'student'] },
  { name: 'Jadwal', path: '/calendar', icon: CalendarIcon, roles: ['teacher', 'student', 'admin'] },
  {
    name: 'Pengumuman',
    path: '/announcements',
    icon: Megaphone,
    roles: ['teacher', 'student', 'admin'],
  },
  { name: 'Menu', path: '/directory', icon: LayoutGrid, roles: ['teacher', 'student', 'admin'] },
]

export function BottomNav() {
  const location = useLocation()
  const { role } = useAuth()

  // Filter items based on role
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <nav
      aria-label="Navigasi utama"
      className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-lg border border-slate-200/50 dark:border-slate-700/50 flex items-center justify-around px-2 z-[999] py-3 rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50"
    >
      {filteredNavItems.map((item) => {
        const isActive =
          location.pathname === item.path || location.pathname.startsWith(item.path + '/')

        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'flex flex-col items-center justify-center w-full min-h-[44px] gap-1 transition-colors relative group',
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            )}
          >
            {isActive && (
              <span className="absolute -bottom-3 w-12 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full" />
            )}
            <item.icon
              className={cn(
                'w-6 h-6 transition-transform group-active:scale-95',
                isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
              )}
            />
            <span className="text-[10px] font-medium truncate max-w-[64px]">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
