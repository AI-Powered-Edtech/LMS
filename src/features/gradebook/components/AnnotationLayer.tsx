import { Check, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { cn } from '@/utils/cn'

import type { AnnotationColor, SubmissionAnnotation } from '../api/annotationApi'
import {
  addAnnotation,
  deleteAnnotation,
  fetchAnnotations,
  updateAnnotation,
} from '../api/annotationApi'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocalAnnotation extends SubmissionAnnotation {
  isOpen: boolean
  isPending: boolean // belum tersimpan ke DB (baru ditambah, belum ada ID dari server)
}

interface AnnotationLayerProps {
  submissionId: string
  isEditable?: boolean
  /** Aktif hanya jika activeTool === 'comment' */
  isCommentToolActive?: boolean
  onAnnotationAdd?: (x: number, y: number) => void
}

// ── Warna Pin ─────────────────────────────────────────────────────────────────

const PIN_COLORS: { value: AnnotationColor; label: string; bg: string; text: string }[] = [
  { value: '#FFD700', label: 'Kuning', bg: 'bg-yellow-400', text: 'text-yellow-900' },
  { value: '#FF4444', label: 'Merah', bg: 'bg-red-500', text: 'text-white' },
  { value: '#44BB44', label: 'Hijau', bg: 'bg-green-500', text: 'text-white' },
]

function getPinStyle(color: string) {
  const found = PIN_COLORS.find((c) => c.value === color)
  return found ?? PIN_COLORS[0]
}

// ── Komponen Pin ──────────────────────────────────────────────────────────────

interface PinProps {
  annotation: LocalAnnotation
  index: number
  isEditable: boolean
  onToggle: (id: string) => void
  onContentChange: (id: string, content: string) => void
  onColorChange: (id: string, color: AnnotationColor) => void
  onSave: (id: string) => void
  onDelete: (id: string) => void
}

function AnnotationPin({
  annotation,
  index,
  isEditable,
  onToggle,
  onContentChange,
  onColorChange,
  onSave,
  onDelete,
}: PinProps) {
  const pinStyle = getPinStyle(annotation.color)

  return (
    <div
      role="presentation"
      className="absolute z-10"
      style={{ left: `${annotation.x_percent}%`, top: `${annotation.y_percent}%` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative group">
        {/* Pin Button */}
        <button
          onClick={() => onToggle(annotation.id)}
          aria-label={`Anotasi ${index + 1}: ${annotation.content || 'Kosong'}`}
          title={annotation.isOpen ? undefined : annotation.content || 'Buka anotasi'}
          className={cn(
            'absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center',
            'shadow-md hover:scale-110 transition-transform border-2 border-white dark:border-slate-800',
            'text-xs font-bold select-none',
            pinStyle.bg,
            pinStyle.text,
            annotation.isPending && 'ring-2 ring-offset-1 ring-blue-400 dark:ring-blue-300'
          )}
        >
          {index + 1}
        </button>

        {/* Popup Komentar */}
        {annotation.isOpen && (
          <div className="absolute top-5 left-5 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Komentar #{index + 1}
              </span>
              <button
                onClick={() => onToggle(annotation.id)}
                aria-label="Tutup popup anotasi"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Textarea */}
            <textarea
              autoFocus={annotation.isPending}
              value={annotation.content}
              onChange={(e) => onContentChange(annotation.id, e.target.value)}
              placeholder="Ketik komentar di sini..."
              readOnly={!isEditable}
              className={cn(
                'w-full text-sm rounded-lg p-2 resize-none h-20',
                'border border-slate-200 dark:border-slate-600',
                'bg-yellow-50/50 dark:bg-yellow-900/20',
                'text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500',
                'focus:outline-none focus:ring-2 focus:ring-blue-400',
                !isEditable && 'cursor-default opacity-80'
              )}
            />

            {/* Pemilih Warna */}
            {isEditable && (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Warna:</span>
                {PIN_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => onColorChange(annotation.id, c.value)}
                    aria-label={`Warna ${c.label}`}
                    className={cn(
                      'w-5 h-5 rounded-full border-2 transition-transform hover:scale-110',
                      c.bg,
                      annotation.color === c.value
                        ? 'border-slate-900 dark:border-white scale-110'
                        : 'border-transparent'
                    )}
                  />
                ))}
              </div>
            )}

            {/* Tombol Aksi */}
            {isEditable && (
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={() => onDelete(annotation.id)}
                  aria-label="Hapus anotasi ini"
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
                <button
                  onClick={() => onSave(annotation.id)}
                  disabled={!annotation.content.trim()}
                  aria-label="Simpan anotasi"
                  className={cn(
                    'flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors',
                    annotation.content.trim()
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                  )}
                >
                  <Check className="w-3.5 h-3.5" />
                  Simpan
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Komponen Utama ─────────────────────────────────────────────────────────────

export function AnnotationLayer({
  submissionId,
  isEditable = true,
  isCommentToolActive = false,
}: AnnotationLayerProps) {
  const [annotations, setAnnotations] = useState<LocalAnnotation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Menyimpan timer debounce per ID anotasi
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // ── Load Anotasi ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!submissionId) return

    let cancelled = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const data = await fetchAnnotations(submissionId)
        if (!cancelled) {
          setAnnotations(data.map((a) => ({ ...a, isOpen: false, isPending: false })))
        }
      } catch (err) {
        if (!cancelled) {
          setError('Gagal memuat anotasi.')
          if (import.meta.env.DEV) console.error('[AnnotationLayer] fetch error:', err)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
      // Bersihkan semua timer debounce saat unmount / submissionId berubah
      debounceTimers.current.forEach((timer) => clearTimeout(timer))
      debounceTimers.current.clear()
    }
  }, [submissionId])

  // ── Handler: Klik dokumen → Tambah pin baru ───────────────────────────────

  const handleDocumentClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isEditable || !isCommentToolActive) return
      const target = e.currentTarget
      const rect = target.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      const tempId = `pending-${Date.now()}`
      const newAnnotation: LocalAnnotation = {
        id: tempId,
        tenant_id: '',
        submission_id: submissionId,
        annotator_id: '',
        x_percent: Math.max(0, Math.min(100, x)),
        y_percent: Math.max(0, Math.min(100, y)),
        content: '',
        color: '#FFD700',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isOpen: true,
        isPending: true,
      }

      setAnnotations((prev) => [...prev, newAnnotation])
    },
    [isEditable, isCommentToolActive, submissionId]
  )

  // ── Handler: Toggle popup ─────────────────────────────────────────────────

  const handleToggle = useCallback((id: string) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, isOpen: !a.isOpen } : a)))
  }, [])

  // ── Handler: Update konten (dengan auto-save debounce) ────────────────────

  const handleContentChange = useCallback(
    (id: string, content: string) => {
      setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, content } : a)))

      // Hanya auto-save untuk anotasi yang sudah tersimpan (bukan pending)
      const annotation = annotations.find((a) => a.id === id)
      if (!annotation?.isPending) {
        const existing = debounceTimers.current.get(id)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(async () => {
          try {
            await updateAnnotation(id, content)
          } catch (err) {
            if (import.meta.env.DEV) console.error('[AnnotationLayer] auto-save error:', err)
          }
          debounceTimers.current.delete(id)
        }, 1000)

        debounceTimers.current.set(id, timer)
      }
    },
    [annotations]
  )

  // ── Handler: Ubah warna ───────────────────────────────────────────────────

  const handleColorChange = useCallback((id: string, color: AnnotationColor) => {
    setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, color } : a)))
  }, [])

  // ── Handler: Simpan (untuk pending dan update warna) ─────────────────────

  const handleSave = useCallback(
    async (id: string) => {
      const annotation = annotations.find((a) => a.id === id)
      if (!annotation) return

      try {
        if (annotation.isPending) {
          // INSERT baru ke database
          const saved = await addAnnotation({
            submission_id: submissionId,
            x_percent: annotation.x_percent,
            y_percent: annotation.y_percent,
            content: annotation.content,
            color: annotation.color as AnnotationColor,
          })
          setAnnotations((prev) =>
            prev.map((a) => (a.id === id ? { ...saved, isOpen: false, isPending: false } : a))
          )
        } else {
          // UPDATE: simpan konten dan tutup popup
          await updateAnnotation(id, annotation.content)
          setAnnotations((prev) => prev.map((a) => (a.id === id ? { ...a, isOpen: false } : a)))
        }
      } catch (err) {
        if (import.meta.env.DEV) console.error('[AnnotationLayer] save error:', err)
        setError('Gagal menyimpan anotasi.')
      }
    },
    [annotations, submissionId]
  )

  // ── Handler: Hapus ────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    async (id: string) => {
      const annotation = annotations.find((a) => a.id === id)
      if (!annotation) return

      // Hapus dari UI segera (optimistic)
      setAnnotations((prev) => prev.filter((a) => a.id !== id))

      // Bersihkan debounce timer jika ada
      const timer = debounceTimers.current.get(id)
      if (timer) {
        clearTimeout(timer)
        debounceTimers.current.delete(id)
      }

      // Jika bukan pending, hapus dari database
      if (!annotation.isPending) {
        try {
          await deleteAnnotation(id)
        } catch (err) {
          if (import.meta.env.DEV) console.error('[AnnotationLayer] delete error:', err)
          // Kembalikan anotasi ke UI jika gagal
          setAnnotations((prev) => [...prev, annotation])
          setError('Gagal menghapus anotasi.')
        }
      }
    },
    [annotations]
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ pointerEvents: isCommentToolActive ? 'auto' : 'none' }}
      onClick={isCommentToolActive ? handleDocumentClick : undefined}
      role="presentation"
      aria-label="Area anotasi dokumen"
    >
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg px-2.5 py-1.5 shadow text-xs text-slate-500 dark:text-slate-400">
          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          Memuat anotasi...
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg px-2.5 py-1.5 shadow text-xs text-red-600 dark:text-red-400">
          {error}
          <button
            onClick={() => setError(null)}
            aria-label="Tutup pesan error"
            className="ml-1 hover:text-red-800 dark:hover:text-red-200"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Annotation pins */}
      <div style={{ pointerEvents: 'auto' }}>
        {annotations.map((ann, idx) => (
          <AnnotationPin
            key={ann.id}
            annotation={ann}
            index={idx}
            isEditable={isEditable}
            onToggle={handleToggle}
            onContentChange={handleContentChange}
            onColorChange={handleColorChange}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </div>
    </div>
  )
}
