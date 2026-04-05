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
  const { role } = useAuth()
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
    if (!item.roles.includes(role)) return false
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
            className="fixed inset-y-0 left-0 w-80 bg-neutral-50 dark:bg-neutral-900 z-[70] shadow-2xl flex flex-col md:hidden"
          >
            {/* Header */}
            <div className="p-spacing-md flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                  EduSync
                </h1>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-spacing-md custom-scrollbar">
              {/* Classroom switcher — hanya untuk teacher */}
              {role === 'teacher' && (
                <div className="mb-spacing-lg">
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
                        'flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200',
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 border border-primary-100 dark:border-primary-800/50'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'w-5 h-5',
                          isActive ? 'text-primary-600' : 'text-neutral-400'
                        )}
                      />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </div>

            {/* Footer */}
            <div className="p-spacing-md border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => void handleSignOut()}
                className="w-full flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-danger-600 font-semibold py-3 px-4 rounded-lg transition-all text-sm"
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
