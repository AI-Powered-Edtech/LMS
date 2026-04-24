import { LogOut, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { ClassroomSwitcher } from '@/features/classroom/components/ClassroomSwitcher'
import { ModuleId, useModuleConfig } from '@/hooks/useModuleConfig'
import { useSignOut } from '@/hooks/useSignOut'
import { navigationItems } from '@/shared/config/navigation'
import { cn } from '@/utils/cn'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const { activeRole } = useAuth()
  const handleSignOut = useSignOut()
  const { isModuleEnabled } = useModuleConfig()

  // Close sidebar on route change
  useEffect(() => {
    onClose()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent body scrolling when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const filteredNavItems = navigationItems.filter((item) => {
    if (item.location !== 'sidebar') return false
    if (!activeRole) return false
    if (!item.roles.includes(activeRole)) return false
    if (item.moduleId && !isModuleEnabled(item.moduleId as ModuleId)) return false
    return true
  })

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-[60] md:hidden"
          />

          {/* Sidebar drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-80 bg-slate-50 dark:bg-slate-900 z-[70] shadow-2xl flex flex-col md:hidden"
          >
            {/* Header */}
            <div className="p-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  EduSync
                </span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Tutup menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {/* Classroom switcher — hanya untuk teacher */}
              {activeRole === 'teacher' && (
                <div className="mb-8">
                  <ClassroomSwitcher variant="neutral" />
                </div>
              )}

              <nav className="space-y-2">
                {filteredNavItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                        isActive
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      )}
                    >
                      <item.icon
                        className={cn('w-5 h-5', isActive ? 'text-blue-600' : 'text-slate-400')}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => void handleSignOut()}
                className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-600 font-semibold py-3 px-4 rounded-xl transition-all text-sm outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <LogOut className="w-4 h-4" />
                Keluar
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
