export interface UploadOptions {
  tenantId: string;
  courseId: string;
  lessonId: string;
  blockId: string; // lesson_resources.id
  bucket: "course-images" | "course-files";
  uploadedBy: string;
  objectPath: string;
}

export interface FileUploadResult {
  storageObjectId: string;
  publicUrl: string;
  objectPath: string;
}
