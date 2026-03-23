import { ImagePlus, Loader2 } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { useBuilder } from '@/src/contexts/BuilderContext'
import { storageService } from '@/src/features/storage'

interface ImageBlockEditorProps {
  blockId: string
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export function ImageBlockEditor({ blockId }: ImageBlockEditorProps) {
  const { state, actions } = useBuilder()
  const { user, tenantId: authTenantId } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const block = state.activeLesson?.blocks.find((b) => b.id === blockId)
  const _tenantId = state.courseId ? '' : '' // Will be fetched from context

  /* eslint-disable react-hooks/exhaustive-deps */
  const handleFile = useCallback(
    async (file: File) => {
      if (!state.courseId || !state.activeLesson) {
        setError('Kursus atau materi belum dimuat')
        return
      }

      setError(null)

      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setError('Format gambar tidak valid. Gunakan JPG, PNG, WebP, atau GIF.')
        return
      }

      // Validate file size
      if (file.size > MAX_IMAGE_SIZE) {
        setError('Ukuran gambar maksimal 5MB.')
        return
      }

      // Show preview
      const objectUrl = URL.createObjectURL(file)
      setPreviewUrl(objectUrl)
      setIsUploading(true)

      try {
        const result = await storageService.uploadFile(file, {
          tenantId: authTenantId || '',
          courseId: state.courseId,
          lessonId: state.activeLesson.id,
          blockId: blockId,
          bucket: 'course-images',
          uploadedBy: user?.id || '',
        })

        actions.updateBlock(blockId, {
          url: result.publicUrl,
        })
        // Note: storage_object_id will be added to DomainBlock type later if needed

        // Release preview URL after successful upload
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(null)
      } catch (err) {
        // Release preview URL on error
        URL.revokeObjectURL(objectUrl)
        setPreviewUrl(null)
        setError(err instanceof Error ? err.message : 'Gagal mengunggah gambar.')
      } finally {
        setIsUploading(false)
      }
    },
    [state.courseId, state.activeLesson, blockId, user?.id, actions]
  )
  /* eslint-enable react-hooks/exhaustive-deps */

  const handleDelete = async () => {
    const storageObjectId = (block as unknown as { storage_object_id?: string })?.storage_object_id

    if (storageObjectId) {
      try {
        await storageService.deleteFile(storageObjectId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal menghapus gambar.')
        return
      }
    }

    actions.updateBlock(blockId, { url: null })
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

  // Uploaded state - show image preview
  if (blockUrl) {
    return (
      <div className="space-y-4">
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <OptimizedImage
            src={blockUrl}
            alt={block.title || 'Gambar'}
            className="w-full max-h-[400px] object-contain"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReplace}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Ganti Gambar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Hapus
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
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
        className={`
          relative flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${isDragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-slate-50'}
          ${isUploading ? 'pointer-events-none' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.gif"
          onChange={handleFileChange}
          className="hidden"
        />

        {isUploading ? (
          <>
            {previewUrl && (
              <OptimizedImage
                src={previewUrl}
                alt="Preview"
                className="w-full max-h-[200px] object-contain mb-4 rounded-lg"
              />
            )}
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-sm text-slate-600">Mengunggah...</p>
          </>
        ) : (
          <>
            <div className="p-3 bg-white rounded-xl shadow-sm mb-3">
              <ImagePlus className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Seret gambar ke sini atau klik untuk memilih
            </p>
            <p className="text-xs text-slate-400">JPG, PNG, WebP, GIF (maks. 5MB)</p>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
