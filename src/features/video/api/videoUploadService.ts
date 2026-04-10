import { getStorageProvider } from '@/services/storage'

import type { UploadProgress } from '../types'
import { videoAssetService } from './videoAssetService'

const VIDEO_BUCKET = 'course-videos'
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024 // 500 MB
const ALLOWED_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
]

export const videoUploadService = {
  validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE_BYTES) return 'Ukuran file melebihi batas 500 MB'
    if (!ALLOWED_MIME_TYPES.includes(file.type))
      return 'Format video tidak didukung. Gunakan MP4, WebM, atau MOV'
    return null
  },

  async uploadVideo(
    file: File,
    lessonId: string | null,
    blockId: string | null,
    tenantId: string,
    onProgress?: (progress: UploadProgress) => void
  ) {
    // Validate
    const validationError = this.validateFile(file)
    if (validationError) throw new Error(validationError)

    // Create asset record (tenant_id set automatically by trigger)
    const asset = await videoAssetService.createAsset({
      lesson_id: lessonId,
      block_id: blockId,
      provider: 'direct',
      original_filename: file.name,
      file_size_bytes: file.size,
      metadata: { mime_type: file.type },
    })

    // Upload to Supabase Storage
    const ext = file.name.split('.').pop() || 'mp4'
    const path = `${tenantId}/${asset.id}.${ext}`

    onProgress?.({ loaded: 0, total: file.size, percentage: 0, status: 'uploading' })

    const { error: storageError } = await getStorageProvider()
      .from(VIDEO_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (storageError) {
      await videoAssetService.updateAssetStatus(asset.id, 'error', {
        error_message: storageError.message,
      })
      throw storageError
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = getStorageProvider().from(VIDEO_BUCKET).getPublicUrl(path)

    onProgress?.({ loaded: file.size, total: file.size, percentage: 100, status: 'ready' })

    // Update asset with the direct URL (mp4_url for direct provider)
    await videoAssetService.updateAssetStatus(asset.id, 'ready', {
      mp4_url: publicUrl,
      hls_url: null,
    })

    return { ...asset, status: 'ready' as const, mp4_url: publicUrl }
  },
}
