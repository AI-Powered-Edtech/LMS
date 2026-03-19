export interface StorageObject {
  id: string;
  tenant_id: string;
  course_id: string | null;
  lesson_id: string | null;
  block_id: string | null;
  bucket: string;
  object_path: string;
  file_name: string | null;
  mime_type: string | null;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface UploadOptions {
  tenantId: string;
  courseId: string;
  lessonId: string;
  blockId: string; // lesson_resources.id
  bucket: 'course-images' | 'course-files';
  uploadedBy: string;
}

export interface UploadResult {
  storageObjectId: string;
  publicUrl: string;
  objectPath: string;
}
