import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui'

import type { FlashcardData, FlashcardItem } from '../types'

interface FlashcardEditorProps {
  data: FlashcardData
  onChange: (data: FlashcardData) => void
}

function createCard(order: number): FlashcardItem {
  return {
    id: `card-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    front: '',
    back: '',
    order,
  }
}

export function FlashcardEditor({ data, onChange }: FlashcardEditorProps) {
  const toggleId = useId()
  const cards = data?.cards ?? []

  const updateCard = (id: string, field: 'front' | 'back', value: string) => {
    onChange({
      ...data,
      cards: cards.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    })
  }

  const addCard = () => {
    onChange({
      ...data,
      cards: [...cards, createCard(cards.length)],
    })
  }

  const removeCard = (id: string) => {
    onChange({
      ...data,
      cards: cards.filter((c) => c.id !== id).map((c, i) => ({ ...c, order: i })),
    })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = [...cards]
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    onChange({ ...data, cards: reordered.map((c, i) => ({ ...c, order: i })) })
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="flashcard-editor">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2">
              {cards.length === 0 && (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  Belum ada kartu. Klik "Tambah Kartu" untuk memulai.
                </p>
              )}
              {cards.map((card, idx) => (
                <Draggable key={card.id} draggableId={card.id} index={idx}>
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className={`flex items-start gap-2 p-3 rounded-xl border transition-shadow ${
                        snap.isDragging
                          ? 'shadow-xl bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <span
                        {...prov.dragHandleProps}
                        className="mt-2 text-slate-400 dark:text-slate-500 cursor-grab"
                      >
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Depan
                          </label>
                          <textarea
                            value={card.front}
                            onChange={(e) => updateCard(card.id, 'front', e.target.value)}
                            rows={2}
                            placeholder="Teks depan kartu..."
                            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                            Belakang
                          </label>
                          <textarea
                            value={card.back}
                            onChange={(e) => updateCard(card.id, 'back', e.target.value)}
                            rows={2}
                            placeholder="Teks belakang kartu..."
                            className="w-full text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => removeCard(card.id)}
                        className="mt-1 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400 transition-colors"
                        aria-label="Hapus kartu"
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

      <div className="flex items-center justify-between pt-1">
        <Button variant="secondary" size="sm" onClick={addCard} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Kartu
        </Button>

        <label className="flex items-center gap-2 cursor-pointer" htmlFor={toggleId}>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Acak urutan saat ditampilkan
          </span>
          <button
            id={toggleId}
            role="switch"
            aria-checked={data?.shuffleOnLoad ?? false}
            onClick={() => onChange({ ...data, shuffleOnLoad: !(data?.shuffleOnLoad ?? false) })}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              data?.shuffleOnLoad ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                data?.shuffleOnLoad ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  )
}
