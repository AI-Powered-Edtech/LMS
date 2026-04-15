import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import {
  ChevronDown,
  ChevronRight,
  FileText,
  FolderOpen,
  GripVertical,
  HelpCircle,
  Pencil,
  Plus,
  Trash2,
  Video,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { ConfirmModal } from '@/src/components/ui'
import { useBuilder } from '@/src/contexts/BuilderContext'
import { cn } from '@/src/utils/cn'

export function BuilderSidebar() {
  const { state, actions } = useBuilder()
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null)
  const [editingModule, setEditingModule] = useState<{ id: string; value: string } | null>(null)
  const [editingLesson, setEditingLesson] = useState<{ id: string; value: string } | null>(null)
  const [confirmState, setConfirmState] = useState<
    | { kind: 'module'; id: string; title: string }
    | { kind: 'lesson'; id: string; title: string }
    | null
  >(null)

  const commitModuleRename = async () => {
    if (!editingModule) return
    const nextTitle = editingModule.value.trim()
    const currentTitle = state.modules.find((m) => m.id === editingModule.id)?.title ?? ''
    setEditingModule(null)
    if (!nextTitle || nextTitle === currentTitle) return
    await actions.updateModule(editingModule.id, { title: nextTitle })
  }

  const cancelModuleRename = () => {
    setEditingModule(null)
  }

  const commitLessonRename = async () => {
    if (!editingLesson) return
    const nextTitle = editingLesson.value.trim()
    const currentTitle =
      state.modules.flatMap((m) => m.lessons).find((l) => l.id === editingLesson.id)?.title ?? ''
    setEditingLesson(null)
    if (!nextTitle || nextTitle === currentTitle) return
    await actions.updateLesson(editingLesson.id, { title: nextTitle })
  }

  const cancelLessonRename = () => {
    setEditingLesson(null)
  }

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

  const getLessonTypeLabel = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video':
        return 'Video'
      case 'article':
        return 'Artikel'
      case 'quiz':
        return 'Kuis'
      default:
        return type
    }
  }

  const getNewLessonTitle = (type: string) => `Materi Baru: ${getLessonTypeLabel(type)}`

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
      const sourceModuleId = source.droppableId
      const destinationModuleId = destination.droppableId

      if (sourceModuleId !== destinationModuleId) {
        actions.moveLesson(
          result.draggableId,
          sourceModuleId,
          destinationModuleId,
          destination.index
        )
        return
      }

      const mod = state.modules.find((m) => m.id === sourceModuleId)
      if (!mod) return
      const lessonIds = mod.lessons.map((l) => l.id)
      const [moved] = lessonIds.splice(source.index, 1)
      lessonIds.splice(destination.index, 0, moved)
      actions.reorderLessons(lessonIds)
    }
  }

  const handleAddModule = () => {
    const count = state.modules.length + 1
    actions.addModule(`Modul ${count}`)
  }

  const handleAddLesson = (moduleId: string, type: string) => {
    actions.addLesson(moduleId, type, getNewLessonTitle(type))
    setAddingLessonTo(null)
    // Auto-expand the module
    setExpandedModules((prev) => new Set(prev).add(moduleId))
  }

  return (
    <div className="w-[340px] bg-slate-50/50 dark:bg-slate-950/30 border-r border-slate-200/40 dark:border-slate-800/40 flex flex-col h-full shrink-0 relative z-10 backdrop-blur-xl">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-200/40 dark:border-slate-800/40 flex items-center justify-between bg-white/40 dark:bg-slate-900/40">
        <div>
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-0.5">
            Struktur Kursus
          </span>
          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Kurikulum Materi
          </span>
        </div>
        <button
          onClick={handleAddModule}
          className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-100 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          title="Tambah Modul"
          aria-label="Tambah Modul"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Module Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {state.loadingCourse ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : state.modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 bg-slate-50/80 dark:bg-slate-900/60 rounded-2xl flex items-center justify-center mb-4 border border-slate-100/50 dark:border-slate-800/60">
              <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-600 dark:text-slate-200 mb-2">
              Belum ada modul
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-400 mb-6 leading-relaxed">
              Mulai bangun kursus Anda dengan menambahkan modul pertama sebagai kerangka.
            </p>
            <button
              onClick={handleAddModule}
              className="text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white px-6 py-2.5 rounded-xl transition-all shadow-sm hover:-translate-y-0.5 flex items-center gap-2"
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
                            snapshot.isDragging &&
                              'shadow-lg ring-2 ring-blue-200 bg-blue-50 dark:ring-blue-900/60 dark:bg-slate-900'
                          )}
                        >
                          {/* Module Header */}
                          <div
                            className={cn(
                              'flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer group',
                              'hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm transition-all border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/60',
                              expandedModules.has(mod.id) &&
                                'bg-white dark:bg-slate-900 shadow-sm border-slate-200/50 dark:border-slate-800/60 mb-1'
                            )}
                            onClick={() => toggleModule(mod.id)}
                          >
                            <div
                              {...dragProvided.dragHandleProps}
                              className="p-0.5 text-slate-300 hover:text-slate-500 dark:text-slate-700 dark:hover:text-slate-400"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </div>
                            {expandedModules.has(mod.id) ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                            )}
                            {editingModule?.id === mod.id ? (
                              <input
                                value={editingModule.value}
                                onChange={(e) =>
                                  setEditingModule({ id: mod.id, value: e.currentTarget.value })
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    void commitModuleRename()
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    cancelModuleRename()
                                  }
                                }}
                                onBlur={() => void commitModuleRename()}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="text-xs font-bold text-slate-700 dark:text-slate-100 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                aria-label="Ubah judul modul"
                              />
                            ) : (
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-100 truncate flex-1">
                                {mod.title}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                              {mod.lessons.length}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingModule({ id: mod.id, value: mod.title })
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                              aria-label="Ubah nama modul"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setConfirmState({ kind: 'module', id: mod.id, title: mod.title })
                              }}
                              className="p-1 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 dark:text-slate-500 hover:text-red-500 rounded transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                              aria-label="Hapus modul"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
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
                                              {...lesDragProvided.dragHandleProps}
                                              onClick={() => {
                                                if (editingLesson?.id === lesson.id) return
                                                actions.selectLesson(lesson.id)
                                              }}
                                              className={cn(
                                                'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group/lesson transition-all text-xs border border-transparent mb-1',
                                                state.activeLesson?.id === lesson.id
                                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold'
                                                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 hover:border-slate-100 dark:hover:border-slate-800',
                                                lesSnapshot.isDragging &&
                                                  'shadow-xl ring-2 ring-indigo-500 bg-white dark:bg-slate-800 scale-105 z-50'
                                              )}
                                            >
                                              <div
                                                className={cn(
                                                  'p-1.5 rounded-lg transition-colors',
                                                  state.activeLesson?.id === lesson.id
                                                    ? 'bg-white/20'
                                                    : 'bg-slate-100 dark:bg-slate-800 group-hover/lesson:bg-white dark:group-hover/lesson:bg-slate-800'
                                                )}
                                              >
                                                {getLessonIcon(lesson.type)}
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                {editingLesson?.id === lesson.id ? (
                                                  <input
                                                    value={editingLesson.value}
                                                    onChange={(e) =>
                                                      setEditingLesson({
                                                        id: lesson.id,
                                                        value: e.currentTarget.value,
                                                      })
                                                    }
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        void commitLessonRename()
                                                      }
                                                      if (e.key === 'Escape') {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        cancelLessonRename()
                                                      }
                                                    }}
                                                    onBlur={() => void commitLessonRename()}
                                                    onClick={(e) => e.stopPropagation()}
                                                    autoFocus
                                                    className={cn(
                                                      'text-sm font-bold truncate bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 w-full',
                                                      'text-slate-700 dark:text-slate-100',
                                                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                                                    )}
                                                    aria-label="Ubah judul materi"
                                                  />
                                                ) : (
                                                  <h4
                                                    className={cn(
                                                      'text-sm font-bold truncate',
                                                      state.activeLesson?.id === lesson.id
                                                        ? 'text-white'
                                                        : 'text-slate-700 dark:text-slate-100'
                                                    )}
                                                  >
                                                    {lesson.title}
                                                  </h4>
                                                )}
                                                <div className="flex items-center gap-2 mt-0.5">
                                                  <span
                                                    className={cn(
                                                      'text-[10px] font-medium uppercase tracking-wider',
                                                      state.activeLesson?.id === lesson.id
                                                        ? 'text-white/70'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                    )}
                                                  >
                                                    {getLessonTypeLabel(lesson.type)}
                                                  </span>
                                                  {!lesson.isPublished && (
                                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400/90 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 shadow-sm shadow-amber-200 dark:shadow-none">
                                                      DRAF
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setEditingLesson({
                                                    id: lesson.id,
                                                    value: lesson.title,
                                                  })
                                                }}
                                                className={cn(
                                                  'p-1.5 rounded-lg transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                                                  state.activeLesson?.id === lesson.id
                                                    ? 'opacity-0 group-hover/lesson:opacity-100 hover:bg-white/20 text-white'
                                                    : 'opacity-0 group-hover/lesson:opacity-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-200'
                                                )}
                                                aria-label="Ubah nama materi"
                                              >
                                                <Pencil className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setConfirmState({
                                                    kind: 'lesson',
                                                    id: lesson.id,
                                                    title: lesson.title,
                                                  })
                                                }}
                                                className={cn(
                                                  'p-1.5 rounded-lg transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500',
                                                  state.activeLesson?.id === lesson.id
                                                    ? 'opacity-0 group-hover/lesson:opacity-100 hover:bg-white/20 text-white'
                                                    : 'opacity-0 group-hover/lesson:opacity-100 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 dark:text-slate-500 hover:text-rose-500'
                                                )}
                                                aria-label="Hapus pelajaran"
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
                                        <div className="flex gap-2 py-2 px-2 bg-white/40 dark:bg-slate-900/40 rounded-xl mt-2 border border-slate-100 dark:border-slate-800">
                                          {[
                                            { type: 'article', color: 'indigo' },
                                            { type: 'video', color: 'blue' },
                                            { type: 'quiz', color: 'rose' },
                                          ].map((t) => (
                                            <button
                                              key={t.type}
                                              onClick={() => handleAddLesson(mod.id, t.type)}
                                              className={cn(
                                                'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-dashed hover:scale-105 active:scale-95',
                                                t.type === 'article' &&
                                                  'text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50',
                                                t.type === 'video' &&
                                                  'text-blue-600 dark:text-blue-300 border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-50 dark:hover:bg-blue-950/50',
                                                t.type === 'quiz' &&
                                                  'text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/30 hover:bg-rose-50 dark:hover:bg-rose-950/50'
                                              )}
                                            >
                                              {getLessonTypeLabel(t.type).toUpperCase()}
                                            </button>
                                          ))}
                                        </div>
                                      ) : (
                                        <button
                                          onClick={() => setAddingLessonTo(mod.id)}
                                          className="w-full mt-2 py-2 text-[10px] font-black text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-900 hover:shadow-sm rounded-xl transition-all flex items-center justify-center gap-1.5 border border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-700 group/add"
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

      <ConfirmModal
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.kind === 'module' ? 'Hapus modul?' : 'Hapus materi?'}
        description={
          confirmState?.kind === 'module'
            ? `Apakah Anda yakin ingin menghapus modul "${confirmState.title}" beserta semua materinya? Tindakan ini tidak dapat dibatalkan.`
            : confirmState?.kind === 'lesson'
              ? `Apakah Anda yakin ingin menghapus materi "${confirmState.title}"? Tindakan ini tidak dapat dibatalkan.`
              : undefined
        }
        confirmText="Hapus"
        cancelText="Batal"
        onConfirm={() => {
          if (!confirmState) return
          if (confirmState.kind === 'module') {
            actions.deleteModule(confirmState.id)
            return
          }
          actions.deleteLesson(confirmState.id)
        }}
      />
    </div>
  )
}
