import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui'
import type { TimelineData, TimelineEvent } from '../types'

interface TimelineEditorProps {
  data: TimelineData
  onChange: (data: TimelineData) => void
}

function createEvent(order: number): TimelineEvent {
  return {
    id: `event-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    date: '',
    title: '',
    description: '',
    imageUrl: '',
    order,
  }
}

export function TimelineEditor({ data, onChange }: TimelineEditorProps) {
  const toggleId = useId()
  const events = data?.events ?? []

  const addEvent = () => {
    onChange({ ...data, events: [...events, createEvent(events.length)] })
  }

  const updateEvent = (id: string, field: keyof TimelineEvent, value: string | number) => {
    onChange({
      ...data,
      events: events.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
    })
  }

  const removeEvent = (id: string) => {
    onChange({
      ...data,
      events: events.filter((e) => e.id !== id).map((e, i) => ({ ...e, order: i })),
    })
  }

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = [...events]
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    onChange({ ...data, events: reordered.map((e, i) => ({ ...e, order: i })) })
  }

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="timeline-editor">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
              {events.length === 0 && (
                <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
                  Belum ada event. Klik "Tambah Event" untuk memulai.
                </p>
              )}
              {events.map((event, idx) => (
                <Draggable key={event.id} draggableId={event.id} index={idx}>
                  {(prov, snap) => (
                    <div
                      ref={prov.innerRef}
                      {...prov.draggableProps}
                      className={`p-3 rounded-xl border transition-shadow ${
                        snap.isDragging
                          ? 'shadow-xl bg-indigo-50 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-600'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          {...prov.dragHandleProps}
                          className="mt-2 text-slate-400 dark:text-slate-500 cursor-grab"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">
                              Tanggal / Periode
                            </label>
                            <input
                              type="text"
                              value={event.date}
                              onChange={(e) => updateEvent(event.id, 'date', e.target.value)}
                              placeholder="Contoh: 17 Agustus 1945"
                              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 dark:text-slate-400">
                              Judul
                            </label>
                            <input
                              type="text"
                              value={event.title}
                              onChange={(e) => updateEvent(event.id, 'title', e.target.value)}
                              placeholder="Judul peristiwa..."
                              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400">
                              Deskripsi
                            </label>
                            <textarea
                              value={event.description}
                              onChange={(e) => updateEvent(event.id, 'description', e.target.value)}
                              rows={2}
                              placeholder="Deskripsi peristiwa..."
                              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 mt-0.5 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-xs text-slate-500 dark:text-slate-400">
                              URL Gambar (opsional)
                            </label>
                            <input
                              type="url"
                              value={event.imageUrl ?? ''}
                              onChange={(e) => updateEvent(event.id, 'imageUrl', e.target.value)}
                              placeholder="https://..."
                              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => removeEvent(event.id)}
                          className="mt-1 text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                          aria-label="Hapus event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
        <Button variant="outline" size="sm" onClick={addEvent} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tambah Event
        </Button>

        <label className="flex items-center gap-2 cursor-pointer" htmlFor={toggleId}>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Orientasi:{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {data?.orientation === 'horizontal' ? 'Horizontal' : 'Vertikal'}
            </strong>
          </span>
          <button
            id={toggleId}
            role="switch"
            aria-checked={data?.orientation === 'horizontal'}
            onClick={() =>
              onChange({
                ...data,
                orientation: data?.orientation === 'horizontal' ? 'vertical' : 'horizontal',
              })
            }
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              data?.orientation === 'horizontal'
                ? 'bg-indigo-500'
                : 'bg-slate-200 dark:bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
                data?.orientation === 'horizontal' ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  )
}
