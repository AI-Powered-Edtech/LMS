import {
  DragDropContext,
  Draggable,
  type DragStart,
  Droppable,
  type DropResult,
} from '@hello-pangea/dnd'
import {
  ArrowDown,
  ArrowUp,
  BookCopy,
  File,
  FileText,
  GripVertical,
  HelpCircle,
  Image,
  Loader2,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Type,
  Video,
  X,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useBuilder } from '@/contexts/BuilderContext'
import { useAICopilotFeatureGate } from '@/features/ai-builder-copilot/hooks/useAICopilotFeatureGate'
import { useBuilderAICopilotStore } from '@/features/ai-builder-copilot/store/builderAICopilot.store'
import { TemplateModal } from '@/features/courses/components/TemplateModal'
import { QuizBlockEditor } from '@/features/quizzes/components/QuizBlockEditor'
import { cn } from '@/utils/cn'

import { AssignmentBlockEditor } from './blocks/AssignmentBlockEditor'
import { FileBlockEditor } from './blocks/FileBlockEditor'
import { ImageBlockEditor } from './blocks/ImageBlockEditor'
import { ScormBlockEditor } from './blocks/ScormBlockEditor'
import { TextBlockEditor } from './blocks/TextBlockEditor'
import { VideoBlockEditor } from './blocks/VideoBlockEditor'
export function LessonBlockEditor() {
  const { state, actions, mobile } = useBuilder()
  const { enabled: copilotEnabled } = useAICopilotFeatureGate()
  const openCopilot = useBuilderAICopilotStore((s) => s.openDrawer)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [deletingBlockId, setDeletingBlockId] = useState<string | null>(null)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  // FIX 1: Local title state with debounced API call
  // Derive the current lesson title from state.modules (activeLesson in state only holds id+blocks)
  const activeLessonTitle =
    state.modules.flatMap((m) => m.lessons).find((l) => l.id === state.activeLesson?.id)?.title ??
    ''

  const [localTitle, setLocalTitle] = useState(activeLessonTitle)

  const activeLessonIdRef = useRef(state.activeLesson?.id)
  useEffect(() => {
    if (state.activeLesson?.id !== activeLessonIdRef.current) {
      activeLessonIdRef.current = state.activeLesson?.id
      const title =
        state.modules.flatMap((m) => m.lessons).find((l) => l.id === state.activeLesson?.id)
          ?.title ?? ''
      setLocalTitle(title)
    }
  }, [state.activeLesson?.id, state.modules])

  const titleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value
      setLocalTitle(newTitle)
      if (state.activeLesson) {
        if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
        titleDebounceRef.current = setTimeout(() => {
          actions.updateLesson(state.activeLesson!.id, { title: newTitle })
        }, 600)
      }
    },
    [state.activeLesson, actions]
  )

  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current)
    }
  }, [])

  if (!state.activeLesson) {
    const hasNoModules = state.modules.length === 0

    return (
      <>
        <main
          id="builder-main"
          aria-label="Editor konten"
          className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 p-6"
        >
          <div className="text-center max-w-sm p-12 bg-white dark:bg-slate-800 rounded-[32px] shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-100/80 dark:border-slate-700/80">
            {hasNoModules ? (
              <>
                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <Sparkles className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tight">
                  Mulai Membuat Kursus
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                  Buat dari awal atau percepat proses dengan menggunakan template yang sudah
                  tersedia.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => setTemplateModalOpen(true)}
                    disabled={!state.courseId}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <BookCopy className="w-5 h-5" />
                    Mulai dari Template
                  </button>
                  <button
                    onClick={() => actions.addModule('Modul Baru')}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-all hover:shadow-sm"
                  >
                    <Plus className="w-5 h-5" />
                    Buat dari Awal
                  </button>
                  {copilotEnabled && (
                    <button
                      onClick={() =>
                        openCopilot('outline', {
                          entryPoint: 'lesson_empty',
                          preSelectedTab: 'outline',
                        })
                      }
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 font-bold rounded-2xl hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-all text-sm"
                    >
                      <Sparkles className="w-5 h-5" />
                      Susun dengan AI
                    </button>
                  )}
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <FileText className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
                  Mulai Menyusun
                </h3>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed max-w-[280px] mx-auto mb-6">
                  Pilih satu materi dari daftar kurikulum untuk mulai mengisi konten pembelajaran.
                </p>
                {copilotEnabled && (
                  <button
                    onClick={() =>
                      openCopilot('outline', {
                        entryPoint: 'lesson_empty',
                        preSelectedTab: 'outline',
                      })
                    }
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 font-bold rounded-2xl hover:bg-violet-100 dark:hover:bg-violet-950/50 transition-all text-sm"
                  >
                    <Sparkles className="w-4 h-4" />
                    Buat Konten dengan AI
                  </button>
                )}
              </>
            )}
          </div>
        </main>

        {/* Template selection modal (course-level) */}
        {state.courseId && (
          <TemplateModal
            isOpen={templateModalOpen}
            onClose={() => setTemplateModalOpen(false)}
            type="module"
            targetId={state.courseId}
          />
        )}
      </>
    )
  }

  if (state.loadingBlocks) {
    return (
      <main
        id="builder-main"
        aria-label="Editor konten"
        className="flex-1 flex items-center justify-center bg-transparent"
      >
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
            Memuat data pelajaran...
          </p>
        </div>
      </main>
    )
  }

  const activeLesson = state.modules
    .flatMap((m) => m.lessons)
    .find((l) => l.id === state.activeLesson?.id)

  const getBlockIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case 'TEXT':
        return <Type className="w-4 h-4 text-slate-500" />
      case 'VIDEO':
        return <Video className="w-4 h-4 text-blue-500" />
      case 'IMAGE':
        return <Image className="w-4 h-4 text-emerald-500" />
      case 'FILE':
        return <File className="w-4 h-4 text-orange-500" />
      case 'QUIZ':
        return <HelpCircle className="w-4 h-4 text-rose-500" />
      case 'ASSIGNMENT':
        return <FileText className="w-4 h-4 text-indigo-500" />
      case 'SCORM':
        return <Package className="w-4 h-4 text-teal-500" />
      default:
        return <FileText className="w-4 h-4 text-slate-500" />
    }
  }

  const handleDragStart = (_start: DragStart) => {
    if (mobile.isMobile || mobile.isTablet) {
      try {
        navigator.vibrate?.(50)
      } catch {
        // navigator.vibrate() not available — non-fatal on non-mobile platforms
      }
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !state.activeLesson) return
    const blockIds = state.activeLesson.blocks.map((b) => b.id)
    const [moved] = blockIds.splice(result.source.index, 1)
    blockIds.splice(result.destination.index, 0, moved)
    actions.reorderBlocks(blockIds)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0 || !state.activeLesson) return
    const blockIds = state.activeLesson.blocks.map((b) => b.id)
    const temp = blockIds[index]
    blockIds[index] = blockIds[index - 1]
    blockIds[index - 1] = temp
    actions.reorderBlocks(blockIds)
  }

  const handleMoveDown = (index: number) => {
    if (!state.activeLesson) return
    const blocks = state.activeLesson.blocks
    if (index === blocks.length - 1) return
    const blockIds = blocks.map((b) => b.id)
    const temp = blockIds[index]
    blockIds[index] = blockIds[index + 1]
    blockIds[index + 1] = temp
    actions.reorderBlocks(blockIds)
  }

  const handleAddBlock = (type: string) => {
    actions.addBlock(type)
    setShowAddMenu(false)
  }

  const blockTypes = [
    {
      type: 'text',
      label: 'Teks',
      icon: <Type className="w-5 h-5" />,
      color: 'text-slate-700 bg-white hover:bg-slate-50 border-slate-200',
    },
    {
      type: 'video',
      label: 'Video',
      icon: <Video className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-50/30 hover:bg-blue-50 border-blue-100',
    },
    {
      type: 'image',
      label: 'Gambar',
      icon: <Image className="w-5 h-5" />,
      color: 'text-emerald-600 bg-emerald-50/30 hover:bg-emerald-50 border-emerald-100',
    },
    {
      type: 'file',
      label: 'File',
      icon: <File className="w-5 h-5" />,
      color: 'text-orange-600 bg-orange-50/30 hover:bg-orange-50 border-orange-100',
    },
    {
      type: 'quiz',
      label: 'Kuis',
      icon: <HelpCircle className="w-5 h-5" />,
      color: 'text-rose-600 bg-rose-50/30 hover:bg-rose-50 border-rose-100',
    },
    {
      type: 'assignment',
      label: 'Tugas',
      icon: <FileText className="w-5 h-5" />,
      color: 'text-indigo-600 bg-indigo-50/30 hover:bg-indigo-50 border-indigo-100',
    },
    {
      type: 'scorm',
      label: 'SCORM',
      icon: <Package className="w-5 h-5" />,
      color: 'text-teal-600 bg-teal-50/30 hover:bg-teal-50 border-teal-100',
    },
  ]

  return (
    <main
      id="builder-main"
      aria-label="Editor konten"
      className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900"
    >
      <div className={cn('max-w-3xl mx-auto py-8', mobile.isMobile ? 'px-4' : 'px-6')}>
        {/* Lesson Header */}
        <div className="mb-10 p-6 md:p-8 bg-white dark:bg-slate-800 rounded-[32px] border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
          <input
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            className={cn(
              'w-full font-black text-slate-800 dark:text-slate-100 bg-transparent border-none outline-none placeholder:text-slate-400 focus:ring-0 tracking-tight',
              mobile.isMobile ? 'text-2xl' : 'text-3xl'
            )}
            placeholder="Judul Materi..."
            aria-label="Judul materi"
          />
          <div className="flex items-center gap-3 mt-4">
            <span
              className={cn(
                'text-[10px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full shadow-sm',
                activeLesson?.isPublished
                  ? 'bg-emerald-500 text-white shadow-emerald-50'
                  : 'bg-amber-400 text-amber-900 shadow-amber-50'
              )}
            >
              {activeLesson?.isPublished ? 'Dipublikasi' : 'Draf'}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {state.activeLesson?.blocks.length ?? 0} KONTEN
            </span>
          </div>
        </div>

        {/* Block List with DND */}
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="blocks" type="BLOCK">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-4 md:space-y-3"
              >
                <AnimatePresence>
                  {(state.activeLesson?.blocks ?? []).map((block, idx) => {
                    return (
                      <Draggable key={block.id} draggableId={block.id} index={idx}>
                        {(dragProvided, snapshot) => (
                          <motion.div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              'bg-white dark:bg-slate-800 rounded-[24px] border shadow-sm group transition-all relative overflow-hidden',
                              snapshot.isDragging
                                ? 'shadow-2xl ring-2 ring-indigo-500/20 border-indigo-400 z-50 scale-[1.02]'
                                : 'border-slate-200/70 dark:border-slate-700/70 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600'
                            )}
                          >
                            {/* Block Header */}
                            <div className="flex items-center gap-2 md:gap-3 px-3 md:px-5 py-3 md:py-4 border-b border-slate-50 dark:border-slate-700/50">
                              <div
                                {...dragProvided.dragHandleProps}
                                className="p-2 flex items-center justify-center min-w-[44px] min-h-[44px] text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 cursor-grab hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors touch-none"
                                aria-label="Pindah konten"
                              >
                                <GripVertical className="w-5 h-5" />
                              </div>
                              <div className="p-2 bg-slate-50 dark:bg-slate-700 rounded-lg">
                                {getBlockIcon(block.type)}
                              </div>
                              <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] flex-1">
                                {{
                                  text: 'TEKS',
                                  video: 'VIDEO',
                                  image: 'GAMBAR',
                                  file: 'FILE',
                                  quiz: 'KUIS',
                                  assignment: 'TUGAS',
                                  scorm: 'SCORM',
                                }[block.type.toLowerCase()] || block.type.toUpperCase()}
                              </span>

                              {/* Non-drag alternative buttons */}
                              <div className="flex items-center md:opacity-0 md:group-hover:opacity-100 transition-opacity gap-1 mr-2">
                                <button
                                  onClick={() => handleMoveUp(idx)}
                                  disabled={idx === 0}
                                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all disabled:opacity-30 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                                  aria-label="Pindah ke atas"
                                  title="Pindah ke atas"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleMoveDown(idx)}
                                  disabled={idx === (state.activeLesson?.blocks.length ?? 0) - 1}
                                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all disabled:opacity-30 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                                  aria-label="Pindah ke bawah"
                                  title="Pindah ke bawah"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                {copilotEnabled && block.type.toUpperCase() === 'TEXT' && (
                                  <button
                                    onClick={() => {
                                      actions.selectBlock(block.id)
                                      openCopilot('improve', {
                                        entryPoint: 'block_action',
                                        targetType: 'block',
                                        targetId: block.id,
                                        preSelectedTab: 'improve',
                                        blockContent: block.content ?? undefined,
                                      })
                                    }}
                                    className="p-2 hover:bg-violet-50 dark:hover:bg-violet-950/30 text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 rounded-xl transition-all focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                                    aria-label="Perbaiki dengan AI"
                                    title="Perbaiki dengan AI"
                                  >
                                    <Sparkles className="w-4 h-4" />
                                  </button>
                                )}
                              </div>

                              {/* FIX 2: Inline delete confirmation — replaces native confirm() */}
                              {deletingBlockId === block.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-xs text-red-600 font-semibold">Hapus?</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      actions.deleteBlock(block.id)
                                      setDeletingBlockId(null)
                                    }}
                                    className="p-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                                    aria-label="Konfirmasi hapus"
                                  >
                                    Ya
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      setDeletingBlockId(null)
                                    }}
                                    className="p-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200"
                                    aria-label="Batal hapus"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setDeletingBlockId(block.id)
                                  }}
                                  className="p-2 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                  aria-label="Hapus konten"
                                  title="Hapus konten"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                            </div>

                            {/* Block Content */}
                            <div className={cn('py-4 md:py-5', mobile.isMobile ? 'px-4' : 'px-6')}>
                              {renderBlockContent(block)}
                            </div>
                          </motion.div>
                        )}
                      </Draggable>
                    )
                  })}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Block Button */}
        <div className="relative mt-8">
          {/* FIX 3: aria-controls links button to the menu it controls */}
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            aria-expanded={showAddMenu}
            aria-controls="add-block-menu"
            className={cn(
              'w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all',
              'border-2 border-dashed outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
              showAddMenu
                ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 shadow-inner'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white dark:hover:bg-slate-800 hover:shadow-md'
            )}
          >
            {showAddMenu ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            {showAddMenu ? 'BATALKAN' : 'TAMBAH KONTEN'}
          </button>

          {/* Block Type Menu */}
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                id="add-block-menu"
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn('mt-4 grid gap-3', mobile.isMobile ? 'grid-cols-2' : 'grid-cols-3')}
              >
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => handleAddBlock(bt.type)}
                    className={cn(
                      'py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.1em] flex flex-col items-center gap-3 transition-all border shadow-sm hover:shadow-md hover:-translate-y-1 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500',
                      bt.color
                    )}
                  >
                    <div className="p-3 bg-white rounded-xl shadow-sm">{bt.icon}</div>
                    {bt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  )
}

function renderBlockContent(block: {
  id: string
  type: string
  content: string | null
  url: string | null
}) {
  switch (block.type?.toUpperCase()) {
    case 'TEXT':
      return <TextBlockEditor blockId={block.id} />
    case 'VIDEO':
      return <VideoBlockEditor blockId={block.id} />
    case 'IMAGE':
      return <ImageBlockEditor blockId={block.id} />
    case 'FILE':
      return <FileBlockEditor blockId={block.id} />
    case 'QUIZ':
      return <QuizBlockEditor blockId={block.id} />
    case 'ASSIGNMENT':
      return <AssignmentBlockEditor blockId={block.id} />
    case 'SCORM':
      return <ScormBlockEditor blockId={block.id} />
    default:
      return <p className="text-xs text-slate-500">Unknown block type: {block.type}</p>
  }
}
