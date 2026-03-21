import { useBuilder } from '@/src/contexts/BuilderContext'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  GripVertical,
  Trash2,
  FileText,
  Video,
  HelpCircle,
  Image,
  File,
  Loader2,
  X,
  Type,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { TextBlockEditor } from './blocks/TextBlockEditor'
import { VideoBlockEditor } from './blocks/VideoBlockEditor'
import { ImageBlockEditor } from './blocks/ImageBlockEditor'
import { FileBlockEditor } from './blocks/FileBlockEditor'
import { QuizBlockEditor } from '@/src/features/quizzes/components/QuizBlockEditor'
import { AssignmentBlockEditor } from './blocks/AssignmentBlockEditor'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'

export function LessonBlockEditor() {
  const { state, actions } = useBuilder()
  const [showAddMenu, setShowAddMenu] = useState(false)

  if (!state.activeLesson) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50/50 p-6">
        <div className="text-center max-w-sm p-12 bg-white rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100/80">
          <div className="w-24 h-24 bg-indigo-50 text-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-inner">
            <FileText className="w-12 h-12" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Mulai Menyusun</h3>
          <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-[280px] mx-auto">
            Pilih satu materi dari daftar kurikulum untuk mulai mengisi konten pembelajaran.
          </p>
        </div>
      </div>
    )
  }

  if (state.loadingBlocks) {
    return (
      <div className="flex-1 flex items-center justify-center bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">
            Memuat data pelajaran...
          </p>
        </div>
      </div>
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
      default:
        return <FileText className="w-4 h-4 text-slate-400" />
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const blockIds = state.activeLesson!.blocks.map((b) => b.id)
    const [moved] = blockIds.splice(result.source.index, 1)
    blockIds.splice(result.destination.index, 0, moved)
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
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto py-8 px-6">
        {/* Lesson Header */}
        <div className="mb-10 p-8 bg-white rounded-[32px] border border-slate-200/60 shadow-sm">
          <input
            type="text"
            value={activeLesson?.title || ''}
            onChange={(e) => {
              if (activeLesson) {
                actions.updateLesson(activeLesson.id, { title: e.target.value })
              }
            }}
            className="w-full text-3xl font-black text-slate-800 bg-transparent border-none outline-none placeholder:text-slate-200 focus:ring-0 tracking-tight"
            placeholder="Judul Materi..."
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
              {activeLesson?.isPublished ? 'Published' : 'Draft'}
            </span>
            <div className="h-4 w-[1px] bg-slate-200 mx-1" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {state.activeLesson.blocks.length}{' '}
              {state.activeLesson.blocks.length === 1 ? 'KONTEN' : 'KONTEN'}
            </span>
          </div>
        </div>

        {/* Block List with DND */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="blocks" type="BLOCK">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                <AnimatePresence>
                  {state.activeLesson!.blocks.map((block, idx) => (
                    <Draggable key={block.id} draggableId={block.id} index={idx}>
                      {(dragProvided, snapshot) => (
                        <motion.div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            'bg-white rounded-[24px] border shadow-sm group transition-all',
                            snapshot.isDragging
                              ? 'shadow-2xl ring-2 ring-indigo-500/20 border-indigo-400 z-50 scale-[1.02]'
                              : 'border-slate-200/70 hover:shadow-md hover:border-slate-300'
                          )}
                        >
                          {/* Block Header */}
                          <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-50">
                            <div
                              {...dragProvided.dragHandleProps}
                              className="p-1 text-slate-300 hover:text-slate-500 cursor-grab hover:bg-slate-50 rounded-lg transition-colors"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="p-1.5 bg-slate-50 rounded-lg">
                              {getBlockIcon(block.type)}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex-1">
                              {block.type}
                            </span>
                            <button
                              onClick={() => {
                                if (confirm('Hapus konten ini?')) {
                                  actions.deleteBlock(block.id)
                                }
                              }}
                              className="p-2 opacity-0 group-hover:opacity-100 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-xl transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Block Content */}
                          <div className="px-6 py-5">{renderBlockContent(block)}</div>
                        </motion.div>
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Block Button */}
        <div className="relative mt-8">
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className={cn(
              'w-full py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-all',
              'border-2 border-dashed',
              showAddMenu
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600 shadow-inner'
                : 'border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-white hover:shadow-md'
            )}
          >
            {showAddMenu ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showAddMenu ? 'BATALKAN' : 'TAMBAH KONTEN'}
          </button>

          {/* Block Type Menu */}
          <AnimatePresence>
            {showAddMenu && (
              <motion.div
                initial={{ opacity: 0, y: 15, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-4 grid grid-cols-3 gap-3"
              >
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    onClick={() => handleAddBlock(bt.type)}
                    className={cn(
                      'py-5 rounded-[24px] font-black text-[10px] uppercase tracking-[0.1em] flex flex-col items-center gap-3 transition-all border shadow-sm hover:shadow-md hover:-translate-y-1',
                      bt.color
                    )}
                  >
                    <div className="p-2.5 bg-white rounded-xl shadow-sm">{bt.icon}</div>
                    {bt.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
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
    default:
      return <p className="text-xs text-slate-400">Unknown block type: {block.type}</p>
  }
}
