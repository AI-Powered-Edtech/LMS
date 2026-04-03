import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  GripVertical,
  HelpCircle,
  Import,
  Plus,
  Save,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { useBuilder } from '@/contexts/BuilderContext'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { translateLessonType } from '@/utils/statusTranslations'

interface BuilderSidebarProps {
  /**
   * Jika true, sidebar dirender langsung (inline) tanpa logika drawer/desktop wrapper.
   * Digunakan untuk mobile tab-based layout di CourseBuilder.
   */
  inlineMode?: boolean
}

export function BuilderSidebar({ inlineMode = false }: BuilderSidebarProps) {
  const { state, actions, mobile } = useBuilder()
  const addToast = useToast((s) => s.addToast)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null)
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [pendingDelete, setPendingDelete] = useState<{
    type: 'module' | 'lesson'
    id: string
    title: string
  } | null>(null)

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const getLessonIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return <Video className="w-4 h-4 text-blue-500" />
      case 'article':
        return <FileText className="w-4 h-4 text-indigo-500" />
      case 'quiz':
        return <HelpCircle className="w-4 h-4 text-rose-500" />
      default:
        return <FileText className="w-4 h-4 text-slate-400" />
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const { source, destination, type } = result

    if (type === 'MODULE') {
      const moduleIds = state.modules.map((m) => m.id)
      const [moved] = moduleIds.splice(source.index, 1)
      moduleIds.splice(destination.index, 0, moved)
      actions.reorderModules(moduleIds)
    }

    if (type === 'LESSON') {
      const moduleId = source.droppableId
      const destinationModuleId = destination.droppableId

      // Cross-module lesson drag is not yet supported
      if (moduleId !== destinationModuleId) {
        addToast({
          type: 'info',
          message:
            'Memindahkan materi antar modul belum didukung. Gunakan tombol tambah materi di modul tujuan.',
        })
        return
      }

      const mod = state.modules.find((m) => m.id === moduleId)
      if (!mod) return
      const lessonIds = mod.lessons.map((l) => l.id)
      const [moved] = lessonIds.splice(source.index, 1)
      lessonIds.splice(destination.index, 0, moved)
      actions.reorderLessons(lessonIds)
    }
  }

  const handleModuleTitleSave = (moduleId: string) => {
    const trimmed = editingTitle.trim()
    if (trimmed && trimmed !== state.modules.find((m) => m.id === moduleId)?.title) {
      actions.updateModule(moduleId, { title: trimmed })
    }
    setEditingModuleId(null)
  }

  const handleAddModule = () => {
    const count = state.modules.length + 1
    actions.addModule(`Module ${count}`)
  }

  const handleAddLesson = (moduleId: string, type: string) => {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)
    actions.addLesson(moduleId, type, `New ${typeLabel}`)
    setAddingLessonTo(null)
    // Auto-expand the module
    setExpandedModules((prev) => new Set(prev).add(moduleId))
  }

  const sidebarContent = (
    <div
      className={cn(
        'bg-slate-50/30 dark:bg-slate-900/30 border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col h-full shrink-0 relative z-10 backdrop-blur-xl',
        inlineMode ? 'w-full' : 'w-[340px]'
      )}
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200/50 flex items-center justify-between bg-white/50">
        <div>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">
            Struktur Kursus
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Kurikulum Materi
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center">
            <button
              onClick={handleAddModule}
              className="flex items-center gap-1 p-2 pr-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-l-xl transition-all shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:z-10"
              title="Buat Modul Baru"
            >
              <Plus className="w-4 h-4" />
              <span className="text-xs font-bold">Modul</span>
            </button>
            <button
              onClick={() => {
                addToast({ type: 'info', message: 'Fitur template kursus segera hadir.' })
              }}
              disabled={!state.courseId}
              className="flex items-center p-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-r-xl transition-all shadow-md shadow-indigo-100 dark:shadow-indigo-900/30 active:scale-95 border-l border-indigo-700/30 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:z-10"
              title="Import dari Template"
              aria-label="Import dari Template"
            >
              <Import className="w-3.5 h-3.5" />
            </button>
          </div>
          {mobile.isMobile && !inlineMode && (
            <button
              onClick={mobile.closeSidebar}
              className="p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              aria-label="Tutup navigasi"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Module Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state.loadingCourse ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : state.modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-slate-50/80 rounded-2xl flex items-center justify-center mb-4 border border-slate-100/50">
              <FolderOpen className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-600 mb-2">Belum ada modul</p>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">
              Mulai bangun kursus Anda dengan menambahkan modul pertama sebagai kerangka.
            </p>
            <button
              onClick={handleAddModule}
              className="text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 px-6 py-2.5 rounded-xl transition-all shadow-sm hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Buat Modul
            </button>
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="modules" type="MODULE">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                  {state.modules.map((mod, modIdx) => (
                    <Draggable key={mod.id} draggableId={mod.id} index={modIdx}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={cn(
                            'rounded-lg transition-colors',
                            snapshot.isDragging && 'shadow-lg ring-2 ring-blue-200 bg-blue-50'
                          )}
                        >
                          {/* Module Header */}
                          <div
                            role="button"
                            tabIndex={0}
                            aria-expanded={expandedModules.has(mod.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                toggleModule(mod.id)
                              }
                            }}
                            className={cn(
                              'flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer group',
                              'hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/50',
                              expandedModules.has(mod.id) &&
                                'bg-white shadow-sm border-slate-200/50 mb-1'
                            )}
                            onClick={() => toggleModule(mod.id)}
                          >
                            <div
                              {...dragProvided.dragHandleProps}
                              className="p-0.5 text-slate-300 hover:text-slate-500"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            {expandedModules.has(mod.id) ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            {editingModuleId === mod.id ? (
                              <input
                                autoFocus
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={() => handleModuleTitleSave(mod.id)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleModuleTitleSave(mod.id)
                                  if (e.key === 'Escape') setEditingModuleId(null)
                                  e.stopPropagation()
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs font-bold text-slate-700 bg-white border border-indigo-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-400 min-w-0"
                              />
                            ) : (
                              <span
                                role="button"
                                tabIndex={0}
                                className="text-xs font-bold text-slate-700 truncate flex-1 cursor-text"
                                onDoubleClick={(e) => {
                                  e.stopPropagation()
                                  setEditingModuleId(mod.id)
                                  setEditingTitle(mod.title)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === 'F2') {
                                    e.stopPropagation()
                                    setEditingModuleId(mod.id)
                                    setEditingTitle(mod.title)
                                  }
                                }}
                                title="Klik dua kali atau tekan Enter untuk mengubah nama"
                              >
                                {mod.title}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 font-medium">
                              {mod.lessons.length}
                            </span>
                            <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToast({
                                    type: 'info',
                                    message: 'Fitur simpan sebagai template segera hadir.',
                                  })
                                }}
                                className="p-2 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                aria-label="Simpan sebagai Template"
                                title="Simpan sebagai Template"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPendingDelete({
                                    type: 'module',
                                    id: mod.id,
                                    title: mod.title,
                                  })
                                }}
                                className="p-2 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded transition-colors ml-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                                aria-label={`Hapus Modul ${mod.title}`}
                                title={`Hapus Modul ${mod.title}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Lessons List */}
                          <AnimatePresence initial={false}>
                            {expandedModules.has(mod.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <Droppable droppableId={mod.id} type="LESSON">
                                  {(lessonProvided) => (
                                    <div
                                      ref={lessonProvided.innerRef}
                                      {...lessonProvided.droppableProps}
                                      className="pl-6 pb-1 space-y-0.5"
                                    >
                                      {mod.lessons.map((lesson, lesIdx) => (
                                        <Draggable
                                          key={lesson.id}
                                          draggableId={lesson.id}
                                          index={lesIdx}
                                        >
                                          {(lesDragProvided, lesSnapshot) => (
                                            <div
                                              ref={lesDragProvided.innerRef}
                                              {...lesDragProvided.draggableProps}
                                              role="button"
                                              tabIndex={0}
                                              onClick={() => {
                                                actions.selectLesson(lesson.id)
                                                if (mobile.isMobile && !inlineMode)
                                                  mobile.closeSidebar()
                                              }}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                  actions.selectLesson(lesson.id)
                                                  if (mobile.isMobile && !inlineMode)
                                                    mobile.closeSidebar()
                                                }
                                              }}
                                              className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group/lesson transition-all text-xs border border-transparent mb-1',
                                                state.activeLesson?.id === lesson.id
                                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold'
                                                  : 'text-slate-600 hover:bg-white hover:border-slate-100',
                                                lesSnapshot.isDragging &&
                                                  'shadow-xl ring-2 ring-indigo-500 bg-white scale-105 z-50'
                                              )}
                                            >
                                              <div
                                                className={cn(
                                                  'p-1.5 rounded-lg transition-colors',
                                                  state.activeLesson?.id === lesson.id
                                                    ? 'bg-white/20'
                                                    : 'bg-slate-100 group-hover/lesson:bg-white'
                                                )}
                                              >
                                                {getLessonIcon(lesson.type)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                <h4
                                                  className={cn(
                                                    'text-sm font-bold truncate',
                                                    state.activeLesson?.id === lesson.id
                                                      ? 'text-white'
                                                      : 'text-slate-700'
                                                  )}
                                                >
                                                  {lesson.title}
                                                </h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span
                                                    className={cn(
                                                      'text-[10px] font-medium uppercase tracking-wider',
                                                      state.activeLesson?.id === lesson.id
                                                        ? 'text-white/70'
                                                        : 'text-slate-400'
                                                    )}
                                                  >
                                                    {translateLessonType(lesson.type)}
                                                  </span>
                                                  {!lesson.isPublished && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400/90 text-amber-900 shadow-sm shadow-amber-200">
                                                      DRAFT
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  addToast({
                                                    type: 'info',
                                                    message:
                                                      'Fitur simpan sebagai template segera hadir.',
                                                  })
                                                }}
                                                className={cn(
                                                  'p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                                                  state.activeLesson?.id === lesson.id
                                                    ? 'hover:bg-white/20 text-white/70 hover:text-white'
                                                    : 'hover:bg-indigo-50 text-slate-500 hover:text-indigo-600'
                                                )}
                                                aria-label="Simpan sebagai Template"
                                                title="Simpan sebagai Template"
                                              >
                                                <Save className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setPendingDelete({
                                                    type: 'lesson',
                                                    id: lesson.id,
                                                    title: lesson.title,
                                                  })
                                                }}
                                                className={cn(
                                                  'p-2 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
                                                  state.activeLesson?.id === lesson.id
                                                    ? 'hover:bg-white/20 text-white/70 hover:text-white'
                                                    : 'hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                                                )}
                                                aria-label={`Hapus Materi ${lesson.title}`}
                                                title={`Hapus Materi ${lesson.title}`}
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>
                                          )}
                                        </Draggable>
                                      ))}
                                      {lessonProvided.placeholder}

                                      {/* Add Lesson Menu */}
                                      {addingLessonTo === mod.id ? (
                                        <div className="flex flex-col gap-2 py-2 px-2 bg-white/40 rounded-xl mt-2 border border-slate-100">
                                          <div className="flex gap-2">
                                            {[
                                              { type: 'article', color: 'indigo' },
                                              { type: 'video', color: 'blue' },
                                              { type: 'quiz', color: 'rose' },
                                            ].map((t) => (
                                              <button
                                                key={t.type}
                                                onClick={() => handleAddLesson(mod.id, t.type)}
                                                className={cn(
                                                  'flex-1 py-2 rounded-lg text-xs font-bold transition-all border border-dashed hover:scale-105 active:scale-95',
                                                  t.type === 'article' &&
                                                    'text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50',
                                                  t.type === 'video' &&
                                                    'text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50',
                                                  t.type === 'quiz' &&
                                                    'text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-50'
                                                )}
                                              >
                                                {{
                                                  article: 'ARTIKEL',
                                                  video: 'VIDEO',
                                                  quiz: 'KUIS',
                                                }[t.type] || t.type.toUpperCase()}
                                              </button>
                                            ))}
                                          </div>
                                          <button
                                            onClick={() => {
                                              setAddingLessonTo(null)
                                              addToast({
                                                type: 'info',
                                                message: 'Fitur template kursus segera hadir.',
                                              })
                                            }}
                                            className="w-full py-2 rounded-lg text-xs font-bold text-emerald-600 border border-dashed border-emerald-200 bg-emerald-50/50 hover:bg-emerald-50 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-1"
                                          >
                                            <Import className="w-4 h-4" />
                                            DARI TEMPLATE
                                          </button>
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setAddingLessonTo(mod.id)}
                                          className="w-full mt-2 py-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all flex items-center justify-center gap-1.5 border border-dashed border-slate-200 hover:border-indigo-200 group/add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-transparent"
                                        >
                                          <Plus className="w-3.5 h-3.5 group-hover/add:rotate-90 transition-transform duration-300" />
                                          TAMBAH MATERI
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </Droppable>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Inline delete confirmation dialog */}
      {pendingDelete && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 p-4"
          onClick={() => setPendingDelete(null)}
          role="presentation"
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-2xl p-5 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">
              {pendingDelete.type === 'module' ? 'Hapus Modul?' : 'Hapus Materi?'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              {pendingDelete.type === 'module'
                ? `"${pendingDelete.title}" beserta seluruh materinya akan dihapus.`
                : `"${pendingDelete.title}" akan dihapus permanen.`}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-medium text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingDelete.type === 'module') actions.deleteModule(pendingDelete.id)
                  else actions.deleteLesson(pendingDelete.id)
                  setPendingDelete(null)
                }}
                className="flex-1 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  // Mode inline: render konten sidebar langsung tanpa wrapper nav/drawer
  if (inlineMode) {
    return <>{sidebarContent}</>
  }

  return (
    <>
      <nav aria-label="Struktur kursus" className="contents">
        {/* Desktop Sidebar */}
        <div className="hidden lg:contents">{sidebarContent}</div>

        {/* Mobile Drawer */}
        <AnimatePresence>
          {mobile.isMobile && mobile.sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex lg:hidden"
            >
              <div
                role="presentation"
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={mobile.closeSidebar}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="relative z-10 flex h-full shadow-2xl"
              >
                {sidebarContent}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </>
  )
}
