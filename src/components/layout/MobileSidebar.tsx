import { Check, ChevronDown, LogOut, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { ModuleId, useModuleConfig } from '@/hooks/useModuleConfig'
import { useToast } from '@/hooks/useToast'
import { navigationItems } from '@/shared/config/navigation'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'

interface MobileSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { role, signOut } = useAuth()
  const { addToast } = useToast()
  const { classrooms, activeClassroomId, setActiveClassroomId, addClassroom } = useClassroom()
  const { isModuleEnabled } = useModuleConfig()

  const [isClassroomDropdownOpen, setIsClassroomDropdownOpen] = useState(false)
  const [isAddingClassroom, setIsAddingClassroom] = useState(false)
  const [isSavingClass, setIsSavingClass] = useState(false)
  const [newClassroomName, setNewClassroomName] = useState('')

  // Close sidebar on route change
  useEffect(() => {
    onClose()
  }, [location.pathname])

  // Prevent scrolling when open
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

  const activeClassroom = classrooms.find((c) => c.id === activeClassroomId)

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newClassroomName.trim() || isSavingClass) return
    setIsSavingClass(true)
    try {
      await addClassroom(newClassroomName.trim())
      setNewClassroomName('')
      setIsAddingClassroom(false)
      setIsClassroomDropdownOpen(false)
    } catch (err: unknown) {
      addToast({
        type: 'error',
        message: `Gagal membuat kelas: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`,
      })
    } finally {
      setIsSavingClass(false)
    }
  }

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

          {/* Sidebar */}
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
                <div className="w-8 h-8 rounded-radius-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center shadow-sm">
                  <span className="text-white font-bold text-lg">E</span>
                </div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                  EduSync
                </h1>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-radius-lg transition-colors"
                aria-label="Tutup menu"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-spacing-md custom-scrollbar">
              {role === 'teacher' && (
                <div className="mb-spacing-lg relative">
                  <button
                    type="button"
                    onClick={() => setIsClassroomDropdownOpen(!isClassroomDropdownOpen)}
                    className="w-full flex items-center justify-between bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-radius-lg p-3"
                  >
                    <div className="flex flex-col items-start truncate pr-2">
                      <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                        Kelas Aktif
                      </span>
                      <span className="text-sm font-bold text-neutral-900 dark:text-neutral-50 truncate w-full text-left">
                        {activeClassroom?.name || 'Pilih kelas'}
                      </span>
                    </div>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        isClassroomDropdownOpen && 'rotate-180'
                      )}
                    />
                  </button>

                  {isClassroomDropdownOpen && (
                    <div className="mt-spacing-xs bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-radius-lg overflow-hidden">
                      {classrooms.map((classroom) => (
                        <button
                          key={classroom.id}
                          onClick={() => {
                            setActiveClassroomId(classroom.id)
                            setIsClassroomDropdownOpen(false)
                          }}
                          className="w-full flex items-center justify-between p-3 text-left hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors border-b border-neutral-200 dark:border-neutral-700 last:border-0"
                        >
                          <span
                            className={cn(
                              'text-sm font-medium',
                              activeClassroomId === classroom.id
                                ? 'text-primary-600'
                                : 'text-neutral-700 dark:text-neutral-300'
                            )}
                          >
                            {classroom.name}
                          </span>
                          {activeClassroomId === classroom.id && (
                            <Check className="w-4 h-4 text-primary-600" />
                          )}
                        </button>
                      ))}
                      <div className="p-2 border-t border-neutral-200 dark:border-neutral-700">
                        {isAddingClassroom ? (
                          <form onSubmit={handleAddClassroom} className="flex flex-col gap-2">
                            <input
                              type="text"
                              value={newClassroomName}
                              onChange={(e) => setNewClassroomName(e.target.value)}
                              placeholder="Nama kelas..."
                              className="w-full px-3 py-2 text-sm border border-neutral-300 dark:border-neutral-600 rounded-radius-sm bg-neutral-50 dark:bg-neutral-700"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                className="flex-1 bg-primary-600 text-white text-xs font-bold py-2 rounded-radius-sm"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsAddingClassroom(false)}
                                className="flex-1 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold py-2 rounded-radius-sm"
                              >
                                Batal
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsAddingClassroom(true)}
                            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-primary-600"
                          >
                            <Plus className="w-4 h-4" />
                            Kelas Baru
                          </button>
                        )}
                      </div>
                    </div>
                  )}
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
                        'flex items-center gap-3 px-4 py-3 rounded-radius-xl font-medium transition-all duration-200',
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
                onClick={async () => {
                  try {
                    await signOut()
                    navigate('/login')
                  } catch (e) {
                    captureError(e)
                  }
                }}
                className="w-full flex items-center justify-center gap-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-danger-600 font-semibold py-3 px-4 rounded-radius-lg transition-all text-sm"
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
