import {
  Download,
  ExternalLink,
  File,
  FileSpreadsheet,
  FileText,
  FileType2,
  Image as ImageIcon,
  Loader2,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Modal, ModalBody, ModalFooter } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'

/* ─── Types ──────────────────────────────────────────────────────── */

export interface FilePreviewModalProps {
  /** File object (lokal, sebelum upload) */
  file: File | null
  /** URL publik dari Supabase Storage (setelah upload) */
  fileUrl: string | null
  fileName: string
  isOpen: boolean
  onClose: () => void
}

type FileCategory = 'pdf' | 'image' | 'text' | 'office' | 'other'

/* ─── Helpers ────────────────────────────────────────────────────── */

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

function getFileCategory(fileName: string, mimeType?: string): FileCategory {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  const mime = mimeType?.toLowerCase() ?? ''

  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf'

  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp']
  const imageMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp',
  ]
  if (imageMimes.some((m) => mime.startsWith(m)) || imageExts.includes(ext)) return 'image'

  const textExts = [
    'txt',
    'md',
    'json',
    'csv',
    'xml',
    'yaml',
    'yml',
    'log',
    'js',
    'ts',
    'jsx',
    'tsx',
    'css',
    'html',
  ]
  const textMimes = ['text/']
  if (textMimes.some((m) => mime.startsWith(m)) || textExts.includes(ext)) return 'text'

  const officeExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp']
  const officeMimes = [
    'application/msword',
    'application/vnd.openxmlformats-officedocument',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
    'application/vnd.oasis',
  ]
  if (officeMimes.some((m) => mime.startsWith(m)) || officeExts.includes(ext)) return 'office'

  return 'other'
}

function getOfficeIcon(fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? ''
  if (['xls', 'xlsx', 'ods'].includes(ext))
    return <FileSpreadsheet className="w-12 h-12 text-success-500" />
  if (['ppt', 'pptx', 'odp'].includes(ext))
    return <FileType2 className="w-12 h-12 text-orange-500" />
  return <FileText className="w-12 h-12 text-primary-500" />
}

/* ─── Content sub-components ─────────────────────────────────────── */

function PdfPreview({ url }: { url: string }) {
  const [loading, setLoading] = useState(true)

  return (
    <div className="relative w-full h-[65vh]">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-2 text-sm text-neutral-500 dark:text-neutral-400">Memuat PDF…</span>
        </div>
      )}
      <iframe
        src={url}
        className={cn(
          'w-full h-full rounded-lg border border-neutral-200 dark:border-neutral-700',
          loading && 'opacity-0'
        )}
        title="Pratinjau PDF"
        onLoad={() => setLoading(false)}
        aria-label="Pratinjau dokumen PDF"
      />
    </div>
  )
}

function ImagePreview({ url, fileName }: { url: string; fileName: string }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  return (
    <div className="flex items-center justify-center min-h-[200px] max-h-[65vh] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
      {loading && !error && (
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Memuat gambar…</span>
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center gap-2 py-8 text-neutral-500 dark:text-neutral-400">
          <ImageIcon className="w-12 h-12 opacity-40" />
          <span className="text-sm">Gambar tidak dapat dimuat</span>
        </div>
      ) : (
        <img
          src={url}
          alt={fileName}
          className={cn(
            'max-w-full max-h-[65vh] object-contain rounded-lg transition-opacity duration-200',
            loading ? 'opacity-0 absolute' : 'opacity-100'
          )}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false)
            setError(true)
          }}
          loading="lazy"
          decoding="async"
        />
      )}
    </div>
  )
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError(false)
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('Gagal memuat file')
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setLoading(false)
      })
      .catch(() => {
        setError(true)
        setLoading(false)
      })
  }, [url])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-neutral-500 dark:text-neutral-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span className="text-sm">Memuat konten…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-neutral-500 dark:text-neutral-400">
        <FileText className="w-12 h-12 opacity-40" />
        <span className="text-sm">Konten tidak dapat dimuat</span>
      </div>
    )
  }

  return (
    <pre
      className={cn(
        'w-full max-h-[65vh] overflow-auto rounded-lg p-4',
        'text-xs font-mono leading-relaxed whitespace-pre-wrap break-words',
        'bg-neutral-100 dark:bg-neutral-800',
        'text-neutral-800 dark:text-neutral-200',
        'border border-neutral-200 dark:border-neutral-700'
      )}
      aria-label="Konten file teks"
    >
      {content}
    </pre>
  )
}

function OfficePreview({
  fileName,
  fileSize,
  url,
}: {
  fileName: string
  fileSize?: number
  url: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-24 h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
        {getOfficeIcon(fileName)}
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200 break-all px-4">
          {fileName}
        </p>
        {fileSize != null && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {formatFileSize(fileSize)}
          </p>
        )}
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
          File Office tidak dapat ditampilkan langsung.
        </p>
        <p className="text-xs text-neutral-400 dark:text-neutral-500">
          Gunakan tombol <span className="font-semibold">"Buka di Tab Baru"</span> untuk melihat
          isinya.
        </p>
      </div>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
            'bg-primary-600 hover:bg-primary-700 text-white',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900'
          )}
        >
          <ExternalLink className="w-4 h-4" />
          Buka di Tab Baru
        </a>
      )}
    </div>
  )
}

function OtherPreview({
  fileName,
  fileSize,
  url,
}: {
  fileName: string
  fileSize?: number
  url: string | null
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      <div className="w-24 h-24 rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-sm">
        <File className="w-12 h-12 text-neutral-400 dark:text-neutral-500" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-base font-semibold text-neutral-800 dark:text-neutral-200 break-all px-4">
          {fileName}
        </p>
        {fileSize != null && (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {formatFileSize(fileSize)}
          </p>
        )}
        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
          Tipe file ini tidak dapat ditampilkan langsung.
        </p>
      </div>
      {url && (
        <a
          href={url}
          download={fileName}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors',
            'bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700',
            'text-neutral-700 dark:text-neutral-200',
            'border border-neutral-200 dark:border-neutral-700',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900'
          )}
        >
          <Download className="w-4 h-4" />
          Unduh File
        </a>
      )}
    </div>
  )
}

/* ─── Main Modal ─────────────────────────────────────────────────── */

export function FilePreviewModal({
  file,
  fileUrl,
  fileName,
  isOpen,
  onClose,
}: FilePreviewModalProps) {
  const objectUrlRef = useRef<string | null>(null)
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null)

  // Resolve the URL: use fileUrl (Supabase) if available, otherwise create object URL from File
  useEffect(() => {
    if (!isOpen) return

    // Prefer Supabase Storage URL
    if (fileUrl) {
      setResolvedUrl(fileUrl)
      return
    }

    // Create object URL from local File
    if (file) {
      const objectUrl = URL.createObjectURL(file)
      objectUrlRef.current = objectUrl
      setResolvedUrl(objectUrl)
      return
    }

    setResolvedUrl(null)
  }, [isOpen, file, fileUrl])

  // Cleanup object URL on unmount or close
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  // Also cleanup when modal closes
  useEffect(() => {
    if (!isOpen && objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
      setResolvedUrl(null)
    }
  }, [isOpen])

  const fileSize = file?.size
  const mimeType = file?.type
  const category = getFileCategory(fileName, mimeType)

  const headerTitle = fileName.length > 50 ? `${fileName.slice(0, 47)}…` : fileName

  const subTitle =
    fileSize != null
      ? `${formatFileSize(fileSize)} · ${fileName.split('.').pop()?.toUpperCase() ?? 'FILE'}`
      : (fileName.split('.').pop()?.toUpperCase() ?? 'FILE')

  function renderContent() {
    if (!resolvedUrl) {
      return (
        <div className="flex flex-col items-center gap-2 py-12 text-neutral-500 dark:text-neutral-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Menyiapkan pratinjau…</span>
        </div>
      )
    }

    switch (category) {
      case 'pdf':
        return <PdfPreview url={resolvedUrl} />
      case 'image':
        return <ImagePreview url={resolvedUrl} fileName={fileName} />
      case 'text':
        return <TextPreview url={resolvedUrl} />
      case 'office':
        return <OfficePreview fileName={fileName} fileSize={fileSize} url={resolvedUrl} />
      default:
        return <OtherPreview fileName={fileName} fileSize={fileSize} url={resolvedUrl} />
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} size="xl" ariaLabel={`Pratinjau file: ${fileName}`}>
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700/60 shrink-0 gap-3">
        <div className="min-w-0 flex-1">
          <h2
            className="text-base font-bold text-neutral-900 dark:text-neutral-50 truncate"
            title={fileName}
          >
            {headerTitle}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{subTitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Tutup pratinjau"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <ModalBody className="overflow-x-hidden">{renderContent()}</ModalBody>

      {/* Footer */}
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={onClose}>
          Tutup
        </Button>
        {resolvedUrl && (
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md transition-colors',
              'bg-primary-600 hover:bg-primary-700 text-white',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900'
            )}
          >
            <ExternalLink className="w-4 h-4" />
            Buka di Tab Baru
          </a>
        )}
      </ModalFooter>
    </Modal>
  )
}
