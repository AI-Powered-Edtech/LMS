# Smart Player Batch 4 — Image/File Upload (SP-3)

## Prerequisites
- Migration 804 (`supabase/migrations/804_storage_objects.sql`) written
- Storage buckets created via `scripts/setup-storage.sql`
- Block Registry already has `image` and `file` types

---

## Task B4-1: Storage Service

**Goal:** Create a reusable service for uploading/deleting files to Supabase Storage with metadata tracking in `storage_objects` table.

**Create file:** `src/features/storage/api/storageService.ts`
**Create file:** `src/features/storage/types/index.ts`
**Create file:** `src/features/storage/index.ts`

### Types (`src/features/storage/types/index.ts`)

```ts
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
  blockId: string;          // lesson_resources.id
  bucket: 'course-images' | 'course-files';
  uploadedBy: string;
}

export interface UploadResult {
  storageObjectId: string;
  publicUrl: string;
  objectPath: string;
}
```

### Service (`src/features/storage/api/storageService.ts`)

```ts
export const storageService = {
  /**
   * Upload a file to Supabase Storage + track in storage_objects.
   * Returns storageObjectId and publicUrl.
   */
  async uploadFile(file: File, opts: UploadOptions): Promise<UploadResult>

  /**
   * Delete a file from both storage_objects table and Supabase Storage bucket.
   */
  async deleteFile(storageObjectId: string): Promise<void>

  /**
   * Get public URL for a storage object path.
   */
  getPublicUrl(bucket: string, objectPath: string): string
}
```

### Implementation details:

1. **`uploadFile`**:
   - Validate file size: images ≤ 5MB, files ≤ 20MB
   - Validate mime type:
     - `course-images`: `image/jpeg, image/png, image/webp, image/gif`
     - `course-files`: `application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-powerpoint, application/vnd.openxmlformats-officedocument.presentationml.presentation, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/zip`
   - Generate `objectPath`: `{tenantId}/{courseId}/{lessonId}/{crypto.randomUUID()}.{ext}`
     - Extract extension from `file.name` (lowercase)
   - Upload: `supabase.storage.from(bucket).upload(objectPath, file)`
   - If upload succeeds, INSERT into `storage_objects` table with all metadata
   - Get public URL: `supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl`
   - Return `{ storageObjectId, publicUrl, objectPath }`
   - If INSERT fails after upload, attempt to delete the uploaded file (cleanup)

2. **`deleteFile`**:
   - SELECT storage_objects row by id (get bucket + object_path)
   - Delete from Supabase Storage: `supabase.storage.from(bucket).remove([objectPath])`
   - DELETE from storage_objects table

3. **`getPublicUrl`**:
   - `supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl`

### Barrel export (`src/features/storage/index.ts`)
```ts
export * from './api/storageService';
export type * from './types';
```

### Constraints:
- TypeScript strict — no `as any`
- All errors must be thrown with descriptive messages
- `npm run build` must pass with zero errors

---

## Task B4-2: Image & File Block Editors (Course Builder)

**Goal:** Let teachers upload images and files directly in the Course Builder.

**Context:** The Course Builder uses block editors in `src/components/CourseBuilder/blocks/`. Each block type has an editor component. `TextBlockEditor.tsx` and `VideoBlockEditor.tsx` already exist as reference.

**Create files:**
- `src/components/CourseBuilder/blocks/ImageBlockEditor.tsx`
- `src/components/CourseBuilder/blocks/FileBlockEditor.tsx`

### Shared requirements for both editors:

The parent passes these props (match existing editor pattern):
```ts
interface BlockEditorProps {
  resource: LessonResource;              // the lesson_resources row
  courseId: string;
  lessonId: string;
  tenantId: string;
  onUpdate: (id: string, updates: Partial<LessonResource>) => void;
}
```

After upload, call:
```ts
onUpdate(resource.id, {
  url: publicUrl,
  storage_object_id: storageObjectId,
});
```

This persists the URL + ownership reference to the DB.

### ImageBlockEditor

UI states:

**Empty state** (no `resource.url`):
- Dashed border drop zone (`border-dashed border-2 border-slate-300`)
- Icon: `ImagePlus` from lucide-react
- Text: "Seret gambar ke sini atau klik untuk memilih"
- Accepted: `.jpg, .png, .webp, .gif`
- Max size: 5MB — show error toast if exceeded

**Uploading state**:
- Show selected image preview (use `URL.createObjectURL(file)`)
- Spinner overlay with "Mengunggah..."
- Disable drop zone

**Uploaded state**:
- Show image preview (`<img src={resource.url}>`)
- "Ganti Gambar" button (triggers new upload, deletes old via `storageService.deleteFile`)
- "Hapus" button (deletes file, clears `resource.url`)

**Drag-and-drop**:
- `onDragOver`: prevent default, highlight border
- `onDrop`: extract file, validate, upload
- Also support click → hidden `<input type="file">`

### FileBlockEditor

UI states:

**Empty state** (no `resource.url`):
- Dashed border upload zone
- Icon: `FileUp` from lucide-react
- Text: "Pilih file untuk diunggah"
- Accepted: `.pdf, .doc, .docx, .ppt, .pptx, .xls, .xlsx, .zip`
- Max size: 20MB

**Uploading state**:
- Show file name + size
- Spinner + "Mengunggah..."

**Uploaded state**:
- File card: icon (based on extension) + filename + file size (formatted: KB/MB)
- "Ganti File" button
- "Hapus" button

**File icon mapping** (use lucide-react):
- PDF → `FileText` (red accent)
- Word → `FileText` (blue accent)
- PowerPoint → `Presentation` or `FileText` (orange accent)
- Excel → `Sheet` or `FileText` (green accent)
- ZIP → `Archive` or `FileText`
- Default → `File`

### Import storageService:
```ts
import { storageService } from '@/src/features/storage';
```

### Constraints:
- Use `useAuth()` to get `user.id` for `uploadedBy`
- Tailwind CSS only — no extra dependencies
- TypeScript strict
- `npm run build` must pass

---

## Task B4-3: Viewer Component Enhancement

**Goal:** Improve image and file block rendering in the student Smart Player.

**File to modify:** `src/components/LessonViewer/BlockRenderer.tsx`

### Image block enhancement (`case 'image'`):

Current code is basic `<img>`. Enhance to:

```tsx
case 'image': {
  if (!block.url) return (
    <div className="px-6 py-4 text-sm text-slate-500 italic">
      Gambar tidak tersedia.
    </div>
  );

  return (
    <div className="px-6 py-4">
      <ImageBlockViewer
        url={block.url}
        alt={block.title || ''}
      />
    </div>
  );
}
```

**Create:** `src/components/LessonViewer/blocks/ImageBlockViewer.tsx`

Features:
- `<img>` with `loading="lazy"`, `rounded-xl`, max-h constraint
- **Loading skeleton**: show `animate-pulse bg-slate-200 rounded-xl` while image loads (use `onLoad` event)
- **Error state**: if image fails to load (`onError`), show "Gambar gagal dimuat" with retry button
- **Click to zoom**: on click, show full-screen overlay (`fixed inset-0 bg-black/80 z-50`) with the image centered and `max-w-[90vw] max-h-[90vh] object-contain`. Click backdrop or press Escape to close.
- Caption: if `alt` is provided, show below image in `text-sm text-slate-500 text-center`

### File block enhancement (`case 'file'`):

Current code is a basic `<a>` link. Enhance to:

**Create:** `src/components/LessonViewer/blocks/FileBlockViewer.tsx`

Features:
- Card UI with border, rounded corners, hover effect
- File icon based on URL extension (or mime type from metadata):
  - `.pdf` → red icon
  - `.doc/.docx` → blue icon
  - `.ppt/.pptx` → orange icon
  - `.xls/.xlsx` → green icon
  - `.zip` → purple icon
  - default → gray icon
- Display: file name (from `block.title` or extract from URL), file type label
- Download button: `<a href={url} download target="_blank">` styled as button
- "Buka" button for PDFs (opens in new tab without download)

### Export new components from `src/components/LessonViewer/index.ts`

### Constraints:
- No new dependencies — use lucide-react icons + Tailwind only
- Escape key handler for lightbox: `useEffect` with `keydown` listener
- TypeScript strict
- `npm run build` must pass
