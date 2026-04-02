import { Maximize, MessageSquarePlus, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react'
import type { RefObject } from 'react'

import { AnnotationLayer } from '@/features/gradebook/components/AnnotationLayer'
import { cn } from '@/utils/cn'

import type { ActiveTool } from './types'

interface DocumentViewerProps {
  isLoading: boolean
  submissionText: string
  studentName: string
  zoom: number
  activeTool: ActiveTool
  /** ID submission dari tabel assignment_submissions. Jika null, anotasi dinonaktifkan. */
  submissionId: string | null
  documentRef: RefObject<HTMLDivElement | null>
  onZoomChange: (zoom: number) => void
  onToolChange: (tool: ActiveTool) => void
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

export function DocumentViewer({
  isLoading,
  submissionText,
  studentName,
  zoom,
  activeTool,
  submissionId,
  documentRef,
  onZoomChange,
  onToolChange,
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
            role="presentation"
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

            {/* AnnotationLayer dirender di atas dokumen, hanya aktif jika submissionId tersedia */}
            {submissionId && (
              <AnnotationLayer
                submissionId={submissionId}
                isEditable
                isCommentToolActive={activeTool === 'comment'}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
