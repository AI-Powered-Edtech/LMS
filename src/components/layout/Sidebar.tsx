import { Check, ChevronDown, LogOut, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '@/src/contexts/AuthContext'
import { useClassroom } from '@/src/features/classroom/hooks/useClassroomQueries'
import { ModuleId, useModuleConfig } from '@/src/hooks/useModuleConfig'
import { useToast } from '@/src/hooks/useToast'
import { navigationItems } from '@/src/shared/config/navigation'
import { cn } from '@/src/utils/cn'
import { logger } from '@/src/utils/logger'

export function Sidebar() {
  const { addToast } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const { role, signOut } = useAuth()
  const { classrooms, activeClassroomId, setActiveClassroomId, addClassroom } = useClassroom()
  const { isModuleEnabled } = useModuleConfig()
  const [isClassroomDropdownOpen, setIsClassroomDropdownOpen] = useState(false)
  const [isAddingClassroom, setIsAddingClassroom] = useState(false)
  const [isSavingClass, setIsSavingClass] = useState(false)
  const [newClassroomName, setNewClassroomName] = useState('')

  const filteredNavItems = navigationItems.filter((item) => {
    // Only show sidebar items
    if (item.location !== 'sidebar') return false

    // Check role
    if (!item.roles.includes(role)) return false

    // Check module config if applicable
    if (item.moduleId && !isModuleEnabled(item.moduleId as ModuleId)) return false

    return true
  })

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
      if (import.meta.env.DEV) logger.error('[Sidebar] Failed to create class:', err)
      addToast({
        type: 'error',
        message: `Gagal membuat kelas: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`,
      })
    } finally {
      setIsSavingClass(false)
    }
  }

  const activeClassroom = classrooms.find((c) => c.id === activeClassroomId)

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4 shrink-0 transition-colors duration-300">
      <div className="flex items-center gap-3 px-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold text-lg">E</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">EduSync</h1>
      </div>

      {role === 'teacher' && (
        <div className="mb-6 px-2 relative">
          <button
            type="button"
            onClick={() => setIsClassroomDropdownOpen(!isClassroomDropdownOpen)}
            aria-expanded={isClassroomDropdownOpen}
            aria-haspopup="listbox"
            aria-label={`Pilih kelas aktif: ${activeClassroom?.name || 'Belum dipilih'}`}
            className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:bg-slate-100 dark:hover:bg-slate-700/80 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex flex-col items-start truncate pr-2">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Kelas Aktif
              </span>
              <span className="text-sm font-bold text-slate-900 dark:text-white truncate w-full text-left">
                {activeClassroom?.name || 'Pilih kelas'}
              </span>
            </div>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-slate-500 dark:text-slate-400 transition-transform',
                isClassroomDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {isClassroomDropdownOpen && (
            <div className="absolute top-full left-2 right-2 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="max-h-48 overflow-y-auto">
                {classrooms.map((classroom) => (
                  <button
                    type="button"
                    key={classroom.id}
                    onClick={() => {
                      setActiveClassroomId(classroom.id)
                      setIsClassroomDropdownOpen(false)
                    }}
                    role="option"
                    aria-selected={activeClassroomId === classroom.id}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0"
                  >
                    <span
                      className={cn(
                        'text-sm font-medium',
                        activeClassroomId === classroom.id
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-700 dark:text-slate-300'
                      )}
                    >
                      {classroom.name}
                    </span>
                    {activeClassroomId === classroom.id && (
                      <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    )}
                  </button>
                ))}
              </div>

              <div className="p-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
                {isAddingClassroom ? (
                  <form onSubmit={handleAddClassroom} className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={newClassroomName}
                      onChange={(e) => setNewClassroomName(e.target.value)}
                      placeholder="Nama kelas..."
                      aria-label="Nama kelas baru"
                      className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={!newClassroomName.trim() || isSavingClass}
                        className="flex-1 bg-blue-600 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50 hover:bg-blue-700"
                      >
                        {isSavingClass ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingClassroom(false)
                          setNewClassroomName('')
                        }}
                        className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600"
                      >
                        Batal
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsAddingClassroom(true)}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
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

      <nav aria-label="Menu utama" className="flex-1 space-y-2 overflow-y-auto hide-scrollbar">
        {filteredNavItems.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-900/30 dark:to-transparent text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800/50'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200'
              )}
            >
              <item.icon
                className={cn(
                  'w-5 h-5',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-400 dark:text-slate-500'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <button
          type="button"
          data-testid="sidebar-signout-button"
          onClick={async () => {
            try {
              await signOut()
            } catch (e) {
              if (import.meta.env.DEV) logger.error('[Sidebar] signOut error:', e)
            } finally {
              navigate('/login')
            }
          }}
          className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-400 hover:text-red-600 font-semibold py-3 px-4 rounded-xl transition-all duration-200 text-sm group"
        >
          <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          Keluar
        </button>
      </div>
    </aside>
  )
}
