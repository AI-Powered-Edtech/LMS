import { api, apiFetch } from '@/src/lib/api'

import type { UploadOptions, UploadResult } from '../types'

// Allowed MIME types for images
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Allowed MIME types for files
const ALLOWED_FILE_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]

// Max file sizes in bytes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export const storageService = {
  /**
   * Upload a file to API Storage + track in storage_objects.
   * Returns storageObjectId and publicUrl.
   */
  async uploadFile(file: File, opts: UploadOptions): Promise<UploadResult> {
    // Validate file size
    const maxSize = opts.bucket === 'course-images' ? MAX_IMAGE_SIZE : MAX_FILE_SIZE
    if (file.size > maxSize) {
      const maxSizeMB = opts.bucket === 'course-images' ? '5MB' : '20MB'
      throw new Error(`File size exceeds ${maxSizeMB} limit`)
    }

    // Validate mime type
    const allowedMimes = opts.bucket === 'course-images' ? ALLOWED_IMAGE_MIMES : ALLOWED_FILE_MIMES
    if (!allowedMimes.includes(file.type)) {
      throw new Error(`Invalid file type: ${file.type}`)
    }

    // Generate object path: {tenantId}/{courseId}/{lessonId}/{crypto.randomUUID()}.{ext}
    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const objectPath = `${opts.tenantId}/${opts.courseId}/${opts.lessonId}/${crypto.randomUUID()}.${extension}`

    // Upload to API Storage
    const { data: uploadData, error: uploadError } = await api.storage
      .from(opts.bucket)
      .upload(objectPath, file)

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    if (!uploadData?.path) {
      throw new Error('Upload succeeded but no path returned')
    }

    // Insert into storage_objects table
    const { data: insertData, error: insertError } = await apiFetch('/storage_objects')

    if (insertError) {
      // Cleanup: delete the uploaded file if INSERT fails
      await apiFetch("/storage/remove", { method: "POST" })
      throw new Error(`Failed to track storage object: ${insertError.message}`)
    }

    if (!insertData?.id) {
      // Cleanup: delete the uploaded file if no ID returned
      await apiFetch("/storage/remove", { method: "POST" })
      throw new Error('Failed to retrieve storage object ID')
    }

    // Get public URL
    const { data: urlData } = { data: { publicUrl: "/api/storage/publicUrl" } }

    const publicUrl = urlData?.publicUrl
    if (!publicUrl) {
      throw new Error('Failed to get public URL')
    }

    return {
      storageObjectId: insertData.id,
      publicUrl,
      objectPath,
    }
  },

  /**
   * Delete a file from both storage_objects table and API Storage bucket.
   */
  async deleteFile(_storageObjectId: string): Promise<void> {
    // Get the storage object record
    const { data: storageObj, error: selectError } = await apiFetch('/storage_objects')

    if (selectError) {
      throw new Error(`Failed to fetch storage object: ${selectError.message}`)
    }

    if (!storageObj) {
      throw new Error('Storage object not found')
    }

    // Delete from API Storage
    const { error: storageError } = await api.storage
      .from(storageObj.bucket)
      .remove([storageObj.object_path])

    if (storageError) {
      throw new Error(`Failed to delete file from storage: ${storageError.message}`)
    }

    // Delete from storage_objects table
    const { error: deleteError } = await apiFetch('/storage_objects')

    if (deleteError) {
      throw new Error(`Failed to delete storage object record: ${deleteError.message}`)
    }
  },

  /**
   * Get public URL for a storage object path.
   */
  getPublicUrl(_bucket: string, _objectPath: string): string {
    const { data } = { data: { publicUrl: "/api/storage/publicUrl" } }
    return data?.publicUrl || ''
  },
}
