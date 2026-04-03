import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { CheckCircle, GripVertical, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui'
import { useToast } from '@/hooks/useToast'

import { useInteractiveProgress } from '../hooks/useInteractiveProgress'
import type { DragDropData } from '../types'
import { scoreDragDrop } from '../utils/interactiveScoring'

interface DragDropBlockProps {
  data: DragDropData
  blockId: string
  lessonId: string
}

const UNASSIGNED_ID = '__unassigned__'

export function DragDropBlock({ data, blockId, lessonId }: DragDropBlockProps) {
  const { progress, markComplete, isCompleted } = useInteractiveProgress(blockId, lessonId)
  const addToast = useToast((s) => s.addToast)

  // placed: itemId → categoryId
  const [placed, setPlaced] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    ;(data?.items ?? []).forEach((item) => {
      initial[item.id] = UNASSIGNED_ID
    })
    return initial
  })

  const [checked, setChecked] = useState(false)

  // Restore from DB progress
  useEffect(() => {
    if (progress?.interaction_data?.placed) {
      setPlaced(progress.interaction_data.placed as Record<string, string>)
      if (progress.is_completed) setChecked(true)
    }
  }, [progress])

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || isCompleted) return
    const { draggableId, destination } = result
    setPlaced((prev) => ({ ...prev, [draggableId]: destination.droppableId }))
    setChecked(false)
  }

  const handleCheck = () => {
    const { score, correctCount, totalCount } = scoreDragDrop(data, placed)
    setChecked(true)
    if (correctCount === totalCount && totalCount > 0) {
      markComplete({ placed }, score)
      addToast({ type: 'success', message: 'Semua item berada di kategori yang tepat!' })
    } else {
      addToast({
        type: 'info',
        message: `${correctCount} dari ${totalCount} item benar. Coba lagi!`,
      })
    }
  }

  const getItemsForZone = (zoneId: string) =>
    (data?.items ?? []).filter((item) => placed[item.id] === zoneId)

  const getItemResult = (itemId: string): 'correct' | 'incorrect' | null => {
    if (!checked) return null
    const item = data.items.find((i) => i.id === itemId)
    if (!item) return null
    return placed[itemId] === item.categoryId ? 'correct' : 'incorrect'
  }

  if (!data?.items?.length || !data?.categories?.length) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
        Data drag &amp; drop belum lengkap.
      </div>
    )
  }

  return (
    <div className="px-6 py-4 space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
          {/* Unassigned pool */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
              Item
            </h3>
            <Droppable droppableId={UNASSIGNED_ID}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[60px] rounded-lg border-2 border-dashed p-2 space-y-2 transition-colors ${
                    snapshot.isDraggingOver
                      ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'
                  }`}
                >
                  {getItemsForZone(UNASSIGNED_ID).map((item, idx) => (
                    <DraggableItem
                      key={item.id}
                      id={item.id}
                      label={item.label}
                      index={idx}
                      result={getItemResult(item.id)}
                      disabled={isCompleted}
                    />
                  ))}
                  {provided.placeholder}
                  {getItemsForZone(UNASSIGNED_ID).length === 0 && (
                    <p className="text-xs text-center text-slate-400 dark:text-slate-500 py-2">
                      Pool kosong
                    </p>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Category zones */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Kategori
            </h3>
            {data.categories.map((cat) => (
              <div key={cat.id}>
                <div
                  className="text-xs font-medium px-2 py-1 rounded-t-md text-white"
                  style={{ backgroundColor: cat.color || '#6366f1' }}
                >
                  {cat.label}
                </div>
                <Droppable droppableId={cat.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[48px] rounded-b-lg rounded-tr-lg border-2 border-t-0 p-2 flex flex-wrap gap-2 transition-colors ${
                        snapshot.isDraggingOver
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {getItemsForZone(cat.id).map((item, idx) => (
                        <DraggableItem
                          key={item.id}
                          id={item.id}
                          label={item.label}
                          index={idx}
                          result={getItemResult(item.id)}
                          disabled={isCompleted}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      <div className="flex items-center gap-3 pt-2">
        {!isCompleted && (
          <Button
            onClick={handleCheck}
            disabled={Object.values(placed).every((v) => v === UNASSIGNED_ID)}
            className="text-sm"
          >
            Periksa Jawaban
          </Button>
        )}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Semua benar! Aktivitas selesai.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function DraggableItem({
  id,
  label,
  index,
  result,
  disabled,
}: {
  id: string
  label: string
  index: number
  result: 'correct' | 'incorrect' | null
  disabled: boolean
}) {
  return (
    <Draggable draggableId={id} index={index} isDragDisabled={disabled}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium select-none transition-colors border ${
            snapshot.isDragging
              ? 'shadow-lg bg-indigo-100 dark:bg-indigo-800 border-indigo-300 dark:border-indigo-600'
              : result === 'correct'
                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300'
                : result === 'incorrect'
                  ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300'
                  : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
          }`}
        >
          <span {...provided.dragHandleProps} className="text-slate-400 dark:text-slate-500">
            <GripVertical className="w-3.5 h-3.5" />
          </span>
          <span className="flex-1">{label}</span>
          {result === 'correct' && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
          {result === 'incorrect' && <XCircle className="w-3.5 h-3.5 text-red-500" />}
        </div>
      )}
    </Draggable>
  )
}
