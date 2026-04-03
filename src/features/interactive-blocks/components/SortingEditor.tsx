import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui'
import type { SortingData, SortingItem } from '../types'

interface SortingEditorProps {
  data: SortingData
  onChange: (data: SortingData) => void
}

function createItem(index: number): SortingItem {
  return {
    id: `sort-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: '',
    correctIndex: index,
  }
}

export function SortingEditor({ data, onChange }: SortingEditorProps) {
  const toggleId = useId()
  const items = data?.items ?? []

  const addItem = () => {
    onChange({
      ...data,
      items: [...items, createItem(items.length)],
    })
  }

  const updateItem = (id: string, label: string) => {
    onChange({
      ...data,
      items: items.map((item) => (item.id === id ? { ...item, label } : item)),
    })
  }

  const removeItem = (id: string) => {
    onChange({
      ...data,
      items: items
        .filter((item) => item.id !== id)
        .map((item, i) => ({ ...item, correctIndex: i })),
    })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = [...items]
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    // The order in editor IS the correct order
    onChange({
      ...data,
      items: reordered.map((item, i) => ({ ...item, correctIndex: i })),
    })
  }

  return (
    <div className="space-y-4">
      {/* Instruction input */}
      <div>
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
          Instruksi
        </label>
        <input
          type="text"
          value={data?.instruction ?? ''}
          onChange={(e) => onChange({ ...data, instruction: e.target.value })}
          placeholder="Contoh: Urutkan langkah-langkah berikut dari awal hingga akhir."
          className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
        />
      </div>

      {/* Items list (order here = correct order) */}
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Urutan di editor ini adalah urutan{' '}
          <strong className="text-slate-700 dark:text-slate-300">jawaban yang benar</strong>. Seret
          untuk mengatur urutan yang benar.
        </p>
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="sorting-items-editor">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
                {items.length === 0 && (
                  <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                    Belum ada item. Klik "Tambah Item".
                  </p>
                )}
                {items.map((item, idx) => (
                  <Draggable key={item.id} draggableId={item.id} index={idx}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-shadow ${
                          snap.isDragging
                            ? 'shadow-xl bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <span
                          {...prov.dragHandleProps}
                          className="text-slate-400 dark:text-slate-500 cursor-grab"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateItem(item.id, e.target.value)}
                          placeholder="Label item..."
                          className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                        />
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                          aria-label="Hapus item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button variant="outline" size="sm" onClick={addItem} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Item
        </Button>

        <label className="flex items-center gap-2 cursor-pointer" htmlFor={toggleId}>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Tampilkan feedback setelah jawab
          </span>
          <button
            id={toggleId}
            role="switch"
            aria-checked={data?.showFeedback ?? true}
            onClick={() => onChange({ ...data, showFeedback: !(data?.showFeedback ?? true) })}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              data?.showFeedback ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                data?.showFeedback ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  )
}
