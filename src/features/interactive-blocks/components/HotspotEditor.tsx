import { MousePointerClick, Plus, Trash2 } from 'lucide-react'
import { useId, useRef, useState } from 'react'

import type { HotspotData, HotspotRegion } from '../types'

interface HotspotEditorProps {
  data: HotspotData
  onChange: (data: HotspotData) => void
}

function createRegion(x: number, y: number): HotspotRegion {
  return {
    id: `region-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    x,
    y,
    width: 10,
    height: 10,
    label: 'Hotspot Baru',
    content: '',
  }
}

export function HotspotEditor({ data, onChange }: HotspotEditorProps) {
  const toggleId = useId()
  const imageRef = useRef<HTMLImageElement>(null)
  const [urlInput, setUrlInput] = useState(data?.imageUrl ?? '')
  const [addingMode, setAddingMode] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const regions = data?.regions ?? []
  const selectedRegion = regions.find((r) => r.id === selectedId) ?? null

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!addingMode || !imageRef.current) return
    const rect = imageRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const newRegion = createRegion(Math.max(0, Math.min(90, x)), Math.max(0, Math.min(90, y)))
    onChange({ ...data, regions: [...regions, newRegion] })
    setSelectedId(newRegion.id)
    setAddingMode(false)
  }

  const updateRegion = (id: string, field: keyof HotspotRegion, value: string | number) => {
    onChange({
      ...data,
      regions: regions.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    })
  }

  const removeRegion = (id: string) => {
    onChange({ ...data, regions: regions.filter((r) => r.id !== id) })
    if (selectedId === id) setSelectedId(null)
  }

  const applyImageUrl = () => {
    onChange({ ...data, imageUrl: urlInput })
  }

  return (
    <div className="space-y-4">
      {/* URL input */}
      <div className="flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="URL gambar..."
          className="flex-1 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 placeholder:text-slate-400"
        />
        <button
          onClick={applyImageUrl}
          className="px-3 py-2 text-sm font-medium bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors"
        >
          Terapkan
        </button>
      </div>

      {/* Image preview + hotspot overlay */}
      {data?.imageUrl && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAddingMode((p) => !p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                addingMode
                  ? 'bg-amber-500 text-white border-amber-600'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <MousePointerClick className="w-3.5 h-3.5" />
              {addingMode ? 'Klik pada gambar...' : 'Tambah Hotspot'}
            </button>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {regions.length} region terdaftar
            </span>
          </div>

          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            className={`relative inline-block w-full rounded-lg overflow-hidden border-2 ${
              addingMode
                ? 'border-amber-400 cursor-crosshair'
                : 'border-slate-200 dark:border-slate-700 cursor-default'
            }`}
            onClick={handleImageClick}
          >
            <img
              ref={imageRef}
              src={data.imageUrl}
              alt="Hotspot preview"
              className="w-full h-auto block pointer-events-none"
              draggable={false}
            />

            {regions.map((region) => (
              <button
                key={region.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedId((p) => (p === region.id ? null : region.id))
                  setAddingMode(false)
                }}
                className={`absolute rounded border-2 transition-all ${
                  selectedId === region.id
                    ? 'border-amber-500 bg-amber-400/30'
                    : 'border-indigo-500 bg-indigo-400/20 hover:bg-indigo-400/30'
                }`}
                style={{
                  left: `${region.x}%`,
                  top: `${region.y}%`,
                  width: `${region.width}%`,
                  height: `${region.height}%`,
                }}
                aria-label={`Edit: ${region.label}`}
              >
                <span className="absolute top-0.5 left-0.5 text-xs bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded px-0.5 leading-none max-w-full truncate">
                  {region.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected region editor */}
      {selectedRegion && (
        <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              Edit Region
            </h4>
            <button
              onClick={() => removeRegion(selectedRegion.id)}
              className="text-red-400 hover:text-red-600 dark:text-red-500 dark:hover:text-red-400"
              aria-label="Hapus region"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-slate-500 dark:text-slate-400">Label</label>
              <input
                type="text"
                value={selectedRegion.label}
                onChange={(e) => updateRegion(selectedRegion.id, 'label', e.target.value)}
                className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(['width', 'height'] as const).map((field) => (
                <div key={field}>
                  <label className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {field === 'width' ? 'Lebar %' : 'Tinggi %'}
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={100}
                    value={selectedRegion[field]}
                    onChange={(e) =>
                      updateRegion(selectedRegion.id, field, parseFloat(e.target.value))
                    }
                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2 py-1.5 mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400">Konten / Deskripsi</label>
            <textarea
              value={selectedRegion.content}
              onChange={(e) => updateRegion(selectedRegion.id, 'content', e.target.value)}
              rows={2}
              placeholder="Informasi yang ditampilkan saat hotspot diklik..."
              className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 px-2.5 py-2 mt-0.5 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {!data?.imageUrl && (
        <div className="flex flex-col items-center gap-2 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg text-slate-400 dark:text-slate-500">
          <Plus className="w-8 h-8" />
          <p className="text-sm">Masukkan URL gambar untuk mulai menambah hotspot</p>
        </div>
      )}

      {/* Mode toggle */}
      <label className="flex items-center justify-between cursor-pointer" htmlFor={toggleId}>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          Mode tampil:{' '}
          <strong className="text-slate-800 dark:text-slate-200">
            {data?.revealMode === 'hover' ? 'Hover' : 'Klik'}
          </strong>
        </span>
        <button
          id={toggleId}
          role="switch"
          aria-checked={data?.revealMode === 'hover'}
          onClick={() =>
            onChange({
              ...data,
              revealMode: data?.revealMode === 'hover' ? 'click' : 'hover',
            })
          }
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            data?.revealMode === 'hover' ? 'bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
              data?.revealMode === 'hover' ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </label>
    </div>
  )
}
