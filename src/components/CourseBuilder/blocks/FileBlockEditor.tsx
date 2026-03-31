import { Archive, File, FileText, FileUp, Loader2, Presentation, Sheet } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { useBuilder } from '@/contexts/BuilderContext'
import { storageService } from '@/features/storage'

interface FileBlockEditorProps {
  blockId: string
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(url: string | null) {
  if (!url) return <File className="w-8 h-8 text-slate-400" />

  const extension = url.split('.').pop()?.toLowerCase() || ''

  switch (extension) {
    case 'pdf':
      return <FileText className="w-8 h-8 text-red-500" />
    case 'doc':
    case 'docx':
      return <FileText className="w-8 h-8 text-blue-500" />
    case 'ppt':
    case 'pptx':
      return <Presentation className="w-8 h-8 text-orange-500" />
    case 'xls':
    case 'xlsx':
      return <Sheet className="w-8 h-8 text-green-500" />
    case 'zip':
    case 'rar':
      return <Archive className="w-8 h-8 text-purple-500" />
    default:
      return <File className="w-8 h-8 text-slate-400" />
  }
}

function getFileTypeLabel(url: string | null): string {
  if (!url) return 'File'

  const extension = url.split('.').pop()?.toLowerCase() || ''

  switch (extension) {
    case 'pdf':
      return 'PDF'
    case 'doc':
    case 'docx':
      return 'Word'
    case 'ppt':
    case 'pptx':
      return 'PowerPoint'
    case 'xls':
    case 'xlsx':
      return 'Excel'
    case 'zip':
    case 'rar':
      return 'ZIP'
    default:
      return 'File'
  }
}

export function FileBlockEditor({ blockId }: FileBlockEditorProps) {
  const { state, actions } = useBuilder()
  const { user, tenantId: authTenantId } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadFileName, setUploadFileName] = useState<string | null>(null)
  const [uploadFileSize, setUploadFileSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const block = state.activeLesson?.blocks.find((b) => b.id === blockId)

  const handleFile = useCallback(
    async (file: File) => {
      if (!state.courseId || !state.activeLesson) {
        setError('Kursus atau materi belum dimuat')
        return
      }

      setError(null)

      // Validate file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setError('Format file tidak valid.')
        return
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError('Ukuran file maksimal 20MB.')
        return
      }

      // Show uploading state
      setUploadFileName(file.name)
      setUploadFileSize(file.size)
      setIsUploading(true)

      try {
        const result = await storageService.uploadFile(file, {
          tenantId: authTenantId || '',
          courseId: state.courseId,
          lessonId: state.activeLesson.id,
          blockId: blockId,
          bucket: 'course-files',
          uploadedBy: user?.id || '',
        })

        actions.updateBlock(blockId, {
          url: result.publicUrl,
          title: file.name,
        })

        setUploadFileName(null)
        setUploadFileSize(null)
      } catch (err) {
        setUploadFileName(null)
        setUploadFileSize(null)
        setError(err instanceof Error ? err.message : 'Gagal mengunggah file.')
      } finally {
        setIsUploading(false)
      }
    },
    [state.courseId, state.activeLesson, blockId, authTenantId, user?.id, actions]
  )

  const handleDelete = async () => {
    if (!confirm('Hapus file ini? File akan dihapus permanen dari penyimpanan.')) return
    const storageObjectId = (block as unknown as { storage_object_id?: string })?.storage_object_id

    if (storageObjectId) {
      try {
        await storageService.deleteFile(storageObjectId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menghapus file.')
        return
      }
    }

    actions.updateBlock(blockId, { url: null, title: null })
  }

  const handleReplace = () => {
    inputRef.current?.click()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }

  if (!block) return null

  const blockUrl = block.url

  // Extract file name from block
  const fileName = block.title || (blockUrl ? blockUrl.split('/').pop() || 'File' : null)
  const fileTypeLabel = getFileTypeLabel(blockUrl)

  // Uploaded state - show file card
  if (blockUrl) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <div className="p-2 bg-white dark:bg-slate-900 rounded-lg shadow-sm">
            {getFileIcon(blockUrl)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">{fileTypeLabel}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReplace}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors disabled:opacity-50"
            >
              Ganti File
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg transition-colors disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    )
  }

  // Empty state / Uploading state
  return (
    <div className="space-y-4">
      <div
        onClick={() => !isUploading && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!isUploading) inputRef.current?.click()
          }
        }}
        className={`
          relative flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${isDragOver ? 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/30' : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500 bg-slate-50 dark:bg-slate-800/30'}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Pilih file"
        />

        {isUploading ? (
          <>
            <Loader2 className="w-8 h-8 text-orange-600 dark:text-orange-400 animate-spin mb-2" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Mengunggah...</p>
            {uploadFileName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {uploadFileName} ({uploadFileSize ? formatFileSize(uploadFileSize) : ''})
              </p>
            )}
          </>
        ) : (
          <>
            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm mb-3">
              <FileUp className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
              Pilih file untuk diunggah
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              PDF, Word, PowerPoint, Excel, ZIP (maks. 20MB)
            </p>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
