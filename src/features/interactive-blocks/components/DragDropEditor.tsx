import { Palette, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'

import { Button } from '@/components/ui'
import type { DragDropData, DragItem, DropCategory } from '../types'

interface DragDropEditorProps {
  data: DragDropData
  onChange: (data: DragDropData) => void
}

const DEFAULT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899']

function createCategory(index: number): DropCategory {
  return {
    id: `cat-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: `Kategori ${index + 1}`,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }
}

function createItem(categories: DropCategory[]): DragItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    label: '',
    categoryId: categories[0]?.id ?? '',
  }
}

export function DragDropEditor({ data, onChange }: DragDropEditorProps) {
  const toggleId = useId()
  const categories = data?.categories ?? []
  const items = data?.items ?? []

  const addCategory = () => {
    const newCat = createCategory(categories.length)
    onChange({ ...data, categories: [...categories, newCat] })
  }

  const updateCategory = (id: string, field: 'label' | 'color', value: string) => {
    onChange({
      ...data,
      categories: categories.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    })
  }

  const removeCategory = (id: string) => {
    onChange({
      ...data,
      categories: categories.filter((c) => c.id !== id),
      items: items.filter((i) => i.categoryId !== id),
    })
  }

  const addItem = () => {
    const newItem = createItem(categories)
    onChange({ ...data, items: [...items, newItem] })
  }

  const updateItem = (id: string, field: 'label' | 'categoryId', value: string) => {
    onChange({
      ...data,
      items: items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    })
  }

  const removeItem = (id: string) => {
    onChange({ ...data, items: items.filter((i) => i.id !== id) })
  }

  return (
    <div className="space-y-5">
      {/* Categories */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Kategori
        </h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <div className="flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="color"
                  value={cat.color}
                  onChange={(e) => updateCategory(cat.id, 'color', e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                  aria-label="Warna kategori"
                />
              </div>
              <input
                type="text"
                value={cat.label}
                onChange={(e) => updateCategory(cat.id, 'label', e.target.value)}
                placeholder="Nama kategori..."
                className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
              />
              <button
                onClick={() => removeCategory(cat.id)}
                className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                aria-label="Hapus kategori"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addCategory}
          className="mt-2 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Kategori
        </Button>
      </div>

      {/* Items */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
          Item
        </h4>
        {categories.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-2">
            Tambahkan kategori terlebih dahulu sebelum menambah item.
          </p>
        )}
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
            >
              <input
                type="text"
                value={item.label}
                onChange={(e) => updateItem(item.id, 'label', e.target.value)}
                placeholder="Label item..."
                className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
              />
              <select
                value={item.categoryId}
                onChange={(e) => updateItem(item.id, 'categoryId', e.target.value)}
                className="text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => removeItem(item.id)}
                className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
                aria-label="Hapus item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addItem}
          disabled={categories.length === 0}
          className="mt-2 flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Item
        </Button>
      </div>

      {/* Feedback toggle */}
      <label className="flex items-center justify-between cursor-pointer" htmlFor={toggleId}>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Tampilkan feedback langsung
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
  )
}
