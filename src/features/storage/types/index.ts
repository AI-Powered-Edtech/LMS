export interface UploadOptions {
  tenantId: string
  courseId: string
  lessonId: string
  blockId: string // lesson_resources.id
  bucket: 'course-images' | 'course-files'
  uploadedBy: string
}

export interface UploadResult {
  storageObjectId: string
  publicUrl: string
  objectPath: string
}
