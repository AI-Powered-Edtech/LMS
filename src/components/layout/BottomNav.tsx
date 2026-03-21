import { Link, useLocation } from 'react-router-dom'
import {
  Home,
  LayoutGrid,
  GraduationCap,
  Calendar as CalendarIcon,
  Megaphone,
  HelpCircle,
  FolderKanban,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useAuth } from '@/src/contexts/AuthContext'

const navItems = [
  // Teacher Primary
  { name: 'Dashboard', path: '/teacher-dashboard', icon: GraduationCap, roles: ['teacher'] },

  // Student Primary
  { name: 'Map', path: '/', icon: Home, roles: ['student'] },
  { name: 'Kuis', path: '/quiz', icon: HelpCircle, roles: ['student'] },

  // Shared Primary
  { name: 'Tugas', path: '/assignments', icon: FolderKanban, roles: ['teacher', 'student'] },
  { name: 'Jadwal', path: '/calendar', icon: CalendarIcon, roles: ['teacher', 'student'] },
  { name: 'Pengumuman', path: '/announcements', icon: Megaphone, roles: ['teacher', 'student'] },
  { name: 'Menu', path: '/directory', icon: LayoutGrid, roles: ['teacher', 'student'] },
]

export function BottomNav() {
  const location = useLocation()
  const { role } = useAuth()

  // Filter items based on role
  const filteredNavItems = navItems.filter((item) => item.roles.includes(role))

  return (
    <nav className="md:hidden fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] left-4 right-4 bg-white/90 backdrop-blur-lg border border-slate-200/50 flex items-center justify-around px-2 z-[999] py-3 rounded-2xl shadow-lg shadow-slate-200/50">
      {filteredNavItems.map((item) => {
        const isActive =
          item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)

        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex flex-col items-center justify-center w-full gap-1 transition-colors relative group',
              isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
            )}
          >
            {isActive && (
              <span className="absolute -bottom-3 w-12 h-1 bg-blue-600 rounded-t-full" />
            )}
            <item.icon
              className={cn(
                'w-6 h-6 transition-transform group-active:scale-95',
                isActive ? 'text-blue-600' : 'text-slate-400'
              )}
            />
            <span className="text-[10px] font-medium truncate max-w-[64px]">{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
