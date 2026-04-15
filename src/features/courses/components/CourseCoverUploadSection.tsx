import { ImagePlus, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { storageService } from '@/src/features/storage'

import { courseService } from '../api/courseService'

export function CourseCoverUploadSection({
  courseId,
  tenantId,
  userId,
  coverUrl,
  onCoverUrlChange,
}: {
  courseId: string
  tenantId: string
  userId: string
  coverUrl: string | null
  onCoverUrlChange: (url: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePick = () => {
    inputRef.current?.click()
  }

  const handleFile = async (file: File) => {
    setError(null)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setUploading(true)

    try {
      const result = await storageService.uploadFile(file, {
        tenantId,
        courseId,
        lessonId: 'course-cover',
        blockId: 'course-cover',
        bucket: 'course-images',
        uploadedBy: userId,
      })

      try {
        await courseService.updateCourse(
          courseId,
          {
            cover_url: result.publicUrl,
            cover_storage_object_id: result.storageObjectId,
          },
          tenantId
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : ''
        if (
          msg.toLowerCase().includes('cover_storage_object_id') ||
          msg.toLowerCase().includes('column') ||
          msg.toLowerCase().includes('unknown')
        ) {
          await courseService.updateCourse(courseId, { cover_url: result.publicUrl }, tenantId)
        } else {
          throw err
        }
      }

      onCoverUrlChange(result.publicUrl)
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
    } catch (err) {
      URL.revokeObjectURL(objectUrl)
      setPreviewUrl(null)
      setError(err instanceof Error ? err.message : 'Gagal mengunggah cover.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Cover / Thumbnail
        </label>
        <button
          type="button"
          onClick={handlePick}
          disabled={uploading}
          className="inline-flex items-center gap-2 px-3 py-2 text-xs font-black rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImagePlus className="w-3.5 h-3.5" />
          )}
          {uploading ? 'Mengunggah...' : coverUrl ? 'Ganti Cover' : 'Unggah Cover'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void handleFile(file)
          }}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
        <div className="flex items-start gap-4">
          <div className="w-44 h-28 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
            {previewUrl || coverUrl ? (
              <OptimizedImage src={previewUrl || coverUrl || ''} alt="Cover kursus" className="w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-400 dark:text-slate-500">
                Belum ada cover
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Tampilkan kursus Anda lebih meyakinkan
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Gunakan gambar 16:9. Maksimal 5MB (JPG/PNG/WebP/GIF).
            </p>
            {error && <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

