// SYNC-HINT: {{ = {{ and }} = }}. Sync tool converts automatically.
import {
  Maximize,
  MessageSquare,
  MessageSquarePlus,
  MousePointer2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import type { RefObject } from 'react'

import { cn } from '@/src/utils/cn'

import type { ActiveTool, Annotation } from './types'

interface DocumentViewerProps {
  isLoading: boolean
  submissionText: string
  studentName: string
  zoom: number
  activeTool: ActiveTool
  annotations: Annotation[]
  documentRef: RefObject<HTMLDivElement | null>
  onZoomChange: (zoom: number) => void
  onToolChange: (tool: ActiveTool) => void
  onDocumentClick: (e: React.MouseEvent) => void
  onAnnotationToggle: (id: string) => void
  onAnnotationUpdate: (id: string, text: string) => void
  onAnnotationDelete: (id: string) => void
}

function DocumentSkeleton() {
  return (
    <div className="w-full max-w-3xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 min-h-[800px] p-12 animate-pulse">
      <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-4" />
      <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4 mb-12" />
      <div className="space-y-4">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mt-8" />
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/5" />
      </div>
    </div>
  )
}

function FallbackEssay() {
  return (
    <>
      <p>
        Perkembangan Artificial Intelligence (AI) dalam dekade terakhir telah memicu perdebatan
        sengit mengenai masa depan lapangan pekerjaan. Di satu sisi, banyak yang khawatir bahwa
        mesin akan menggantikan peran manusia dalam berbagai sektor industri.
      </p>
      <p>
        Namun, sejarah menunjukkan bahwa setiap revolusi industri selalu menciptakan jenis pekerjaan
        baru yang sebelumnya tidak pernah terbayangkan. Misalnya, munculnya profesi seperti{' '}
        <em>Prompt Engineer</em> atau <em>AI Ethics Officer</em>.
      </p>
      <p>
        Pendidikan memainkan peran penting dalam mempersiapkan generasi mendatang untuk menghadapi
        perubahan ini. Kurikulum harus beradaptasi untuk mengajarkan keterampilan yang tidak mudah
        diotomatisasi, seperti pemikiran kritis, kreativitas, dan kecerdasan emosional.
      </p>
      <p>
        Oleh karena itu, AI tidak akan menggantikan manusia, melainkan manusia yang menggunakan AI
        akan menggantikan manusia yang tidak menggunakannya. Kolaborasi antara kecerdasan buatan dan
        kecerdasan manusia adalah kunci untuk mencapai kemajuan yang berkelanjutan.
      </p>
    </>
  )
}

function AnnotationPin({
  annotation,
  onToggle,
  onUpdate,
  onDelete,
}: {
  annotation: Annotation
  onToggle: (id: string) => void
  onUpdate: (id: string, text: string) => void
  onDelete: (id: string) => void
}) {
  return (
    <div
      className="absolute"
      style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative group">
        <button
          onClick={() => onToggle(annotation.id)}
          aria-label="Buka komentar anotasi"
          className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 border-2 border-white dark:border-slate-800"
        >
          <MessageSquare className="w-4 h-4" />
        </button>

        {annotation.isOpen && (
          <div className="absolute top-4 left-4 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 p-3 z-20">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                Komentar
              </span>
              <button
                onClick={() => onDelete(annotation.id)}
                aria-label="Hapus anotasi"
                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <textarea
              autoFocus
              value={annotation.text}
              onChange={(e) => onUpdate(annotation.id, e.target.value)}
              placeholder="Ketik komentar di sini..."
              className="w-full text-sm border-none bg-yellow-50/50 dark:bg-yellow-900/20 rounded-lg p-2 focus:ring-0 resize-none h-20 dark:text-white dark:placeholder:text-slate-500"
            />
            <div className="flex justify-end mt-2">
              <button
                onClick={() => onToggle(annotation.id)}
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
              >
                Selesai
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function DocumentViewer({
  isLoading,
  submissionText,
  studentName,
  zoom,
  activeTool,
  annotations,
  documentRef,
  onZoomChange,
  onToolChange,
  onDocumentClick,
  onAnnotationToggle,
  onAnnotationUpdate,
  onAnnotationDelete,
}: DocumentViewerProps) {
  return (
    <div className="flex-1 bg-slate-200/50 dark:bg-slate-900/50 flex flex-col relative">
      {/* Document Toolbar */}
      <div className="h-12 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 shrink-0 z-10">
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => onToolChange('pointer')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              activeTool === 'pointer'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
            title="Pilih (Pointer)"
            aria-label="Pilih (Pointer)"
          >
            <MousePointer2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onToolChange('comment')}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              activeTool === 'comment'
                ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            )}
            title="Tambah Komentar"
            aria-label="Tambah komentar"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onZoomChange(Math.max(50, zoom - 10))}
            aria-label="Perkecil"
            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400 w-12 text-center">
            {zoom}%
          </span>
          <button
            onClick={() => onZoomChange(Math.min(200, zoom + 10))}
            aria-label="Perbesar"
            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1" />
          <button
            onClick={() => onZoomChange(100)}
            className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
            title="Fit to Width"
            aria-label="Sesuaikan lebar"
          >
            <Maximize className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Document Area */}
      <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start">
        {isLoading ? (
          <DocumentSkeleton />
        ) : (
          <div
            ref={documentRef}
            onClick={onDocumentClick}
            className={cn(
              'bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 p-12 relative origin-top transition-transform duration-200',
              activeTool === 'comment' ? 'cursor-crosshair' : 'cursor-default'
            )}
            style={{
              width: '100%',
              maxWidth: '800px',
              minHeight: '1131px',
              transform: `scale(${zoom / 100})`,
              marginBottom: `${zoom > 100 ? (zoom - 100) * 11 : 0}px`,
            }}
          >
            <div className="border-b border-slate-200 dark:border-slate-700 pb-6 mb-6">
              <h2 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">
                Tugas Esai
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2">Oleh: {studentName}</p>
            </div>

            <div className="prose prose-slate dark:prose-invert font-serif leading-loose text-slate-800 dark:text-slate-200 max-w-none">
              {submissionText ? (
                submissionText
                  .split('\n')
                  .map((paragraph, idx) => (paragraph.trim() ? <p key={idx}>{paragraph}</p> : null))
              ) : (
                <FallbackEssay />
              )}
            </div>

            {annotations.map((ann) => (
              <AnnotationPin
                key={ann.id}
                annotation={ann}
                onToggle={onAnnotationToggle}
                onUpdate={onAnnotationUpdate}
                onDelete={onAnnotationDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
