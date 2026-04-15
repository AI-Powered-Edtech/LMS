/**
 * ClassroomSwitcher — Komponen dropdown untuk memilih dan membuat kelas aktif.
 *
 * Sebelumnya logika ini diduplikasi verbatim di Sidebar.tsx dan MobileSidebar.tsx
 * (~80 baris identik per file). Komponen ini mengkonsolidasikan keduanya.
 *
 * Digunakan di: Sidebar (desktop), MobileSidebar (mobile drawer)
 */
import { Check, ChevronDown, Plus } from 'lucide-react'
import { useState } from 'react'

import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

interface ClassroomSwitcherProps {
  /** Varian visual: 'slate' untuk Sidebar desktop, 'neutral' untuk MobileSidebar */
  variant?: 'slate' | 'neutral'
}

export function ClassroomSwitcher({ variant = 'slate' }: ClassroomSwitcherProps) {
  const { classrooms, activeClassroomId, setActiveClassroomId, addClassroom } = useClassroom()
  const { addToast } = useToast()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isAddingClassroom, setIsAddingClassroom] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newName, setNewName] = useState('')

  const activeClassroom = classrooms.find((c) => c.id === activeClassroomId)

  const isNeutral = variant === 'neutral'

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || isSaving) return
    setIsSaving(true)
    try {
      await addClassroom(newName.trim())
      setNewName('')
      setIsAddingClassroom(false)
      setIsDropdownOpen(false)
    } catch (err: unknown) {
      if (import.meta.env.DEV) logger.error('[ClassroomSwitcher] Failed to create class:', err)
      addToast({
        type: 'error',
        message: `Gagal membuat kelas: ${err instanceof Error ? err.message : 'Terjadi kesalahan.'}`,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        aria-label={`Pilih kelas aktif: ${activeClassroom?.name || 'Belum dipilih'}`}
        className={cn(
          'w-full flex items-center justify-between border rounded-xl p-3 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500',
          isNeutral
            ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/80'
        )}
      >
        <div className="flex flex-col items-start truncate pr-2">
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-widest',
              isNeutral
                ? 'text-neutral-400 dark:text-neutral-500'
                : 'text-slate-400 dark:text-slate-500'
            )}
          >
            Kelas Aktif
          </span>
          <span
            className={cn(
              'text-sm font-bold truncate w-full text-left',
              isNeutral ? 'text-neutral-900 dark:text-neutral-50' : 'text-slate-900 dark:text-white'
            )}
          >
            {activeClassroom?.name || 'Pilih kelas'}
          </span>
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform shrink-0',
            isDropdownOpen && 'rotate-180',
            isNeutral ? 'text-neutral-500' : 'text-slate-500 dark:text-slate-400'
          )}
        />
      </button>

      {/* Dropdown */}
      {isDropdownOpen && (
        <div
          className={cn(
            'absolute top-full left-0 right-0 mt-2 border rounded-xl shadow-lg z-50 overflow-hidden',
            isNeutral
              ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
          )}
        >
          {/* Classroom list */}
          <div className="max-h-48 overflow-y-auto">
            {classrooms.map((classroom) => {
              const isActive = activeClassroomId === classroom.id
              return (
                <button
                  type="button"
                  key={classroom.id}
                  onClick={() => {
                    setActiveClassroomId(classroom.id)
                    setIsDropdownOpen(false)
                  }}
                  role="option"
                  aria-selected={isActive}
                  className={cn(
                    'w-full flex items-center justify-between p-3 text-left transition-colors border-b last:border-0',
                    isNeutral
                      ? 'hover:bg-neutral-200 dark:hover:bg-neutral-700 border-neutral-200 dark:border-neutral-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-100 dark:border-slate-800'
                  )}
                >
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isActive
                        ? isNeutral
                          ? 'text-primary-600'
                          : 'text-blue-600 dark:text-blue-400'
                        : isNeutral
                          ? 'text-neutral-700 dark:text-neutral-300'
                          : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {classroom.name}
                  </span>
                  {isActive && (
                    <Check
                      className={cn(
                        'w-4 h-4 shrink-0',
                        isNeutral ? 'text-primary-600' : 'text-blue-600 dark:text-blue-400'
                      )}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Add classroom footer */}
          <div
            className={cn(
              'p-2 border-t',
              isNeutral
                ? 'border-neutral-200 dark:border-neutral-700'
                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
            )}
          >
            {isAddingClassroom ? (
              <form onSubmit={handleAddClassroom} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nama kelas..."
                  aria-label="Nama kelas baru"
                  className={cn(
                    'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500',
                    isNeutral
                      ? 'border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-white'
                      : 'border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                  )}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={!newName.trim() || isSaving}
                    className={cn(
                      'flex-1 text-white text-xs font-bold py-2 rounded-lg disabled:opacity-50',
                      isNeutral
                        ? 'bg-primary-600 hover:bg-primary-700'
                        : 'bg-blue-600 hover:bg-blue-700'
                    )}
                  >
                    {isSaving ? 'Menyimpan...' : 'Simpan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingClassroom(false)
                      setNewName('')
                    }}
                    className={cn(
                      'flex-1 text-xs font-bold py-2 rounded-lg',
                      isNeutral
                        ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 dark:hover:bg-neutral-600'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600'
                    )}
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingClassroom(true)}
                className={cn(
                  'w-full flex items-center justify-center gap-2 py-2 text-sm font-bold rounded-lg transition-colors',
                  isNeutral
                    ? 'text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
                    : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                )}
              >
                <Plus className="w-4 h-4" />
                Kelas Baru
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
