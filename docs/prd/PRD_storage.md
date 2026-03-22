# PRD — Storage (Penyimpanan File)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Live
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/storage/`

---

## 1. Problem Statement

EduSync membutuhkan sistem penyimpanan file yang **aman, scalable, dan multi-tenant** untuk mendukung konten pembelajaran di berbagai konteks:

- Guru upload **lesson materials** (PDF, images, documents) ke kursus
- Guru upload **assignment rubrics** dan sample solutions (documents, spreadsheets)
- Siswa submit **assignment submissions** (documents, photos, video)
- Admin upload **school branding** (logo, cover images)
- Guru create **lesson resources** (worksheet PDFs, activity guides)

Saat ini, EduSync tidak memiliki unified file management system. File uploads tidak proper terintegrasi dengan Supabase Storage. Masalah utama:

- **Security & Multi-Tenancy:** File dari sekolah A tidak boleh accessible oleh sekolah B. RLS + Storage bucket policies belum sepenuhnya implemented.
- **Performance:** Large file uploads (>50 MB) sering timeout atau fail. No resumable upload atau progress tracking.
- **Storage Quota:** Tidak ada limit/monitoring per tenant. Sekolah besar bisa infinitely upload, causing cost overrun.
- **File Organization:** No centralized file management UI. Teachers lost files; hard to find old submissions.
- **Deletion & Cleanup:** Soft-deleted courses still keep files in storage; no cleanup mechanism → bloated storage costs.

**Competitive Context:** Google Classroom, Ruangguru provide seamless file upload UX. Users expect drag-drop, progress bars, storage stats.

---

## 2. Goals

1. **Secure Multi-Tenant Storage:** All file uploads scoped to tenant_id; RLS + Storage policies enforce isolation. Zero data leakage.
2. **Reliable Upload Service:** Support files up to 100 MB; resumable uploads for large files; real-time progress tracking; automatic retry on failure.
3. **Storage Quota Management:** Track per-tenant storage usage; set quotas per school; alert admin when approaching limit; optionally block uploads above quota.
4. **Organized File Management:** Centralized file browser UI for teachers + students; organized by feature (courses, assignments, submissions); search + sort; bulk delete.
5. **Cost Optimization:** Implement cleanup policies: auto-delete old submissions after retention period (configurable), soft-delete course files, cleanup mechanism.
6. **Accessibility & Performance:** Files download quickly; served via CDN; proper caching headers; mobile-friendly file preview.

---

## 3. Non-Goals

1. **Advanced File Preview (v1)** — PDF, image, video preview in browser (only basic rendering). Advanced viewers like Figma, 3D model preview deferred to P1.
2. **File Encryption at Rest** — Files stored plain in Supabase Storage (encrypted by AWS/GCP default). End-to-end encryption deferred to Phase 6 (security hardening).
3. **Backup & Disaster Recovery** — Not in v1 scope; assume Supabase handles backup (per Supabase docs).
4. **Third-Party Cloud Integration** — Google Drive, OneDrive, AWS S3 sync deferred. Supabase Storage only for v1.
5. **Real-Time Collaboration (Office)** — No Google Docs / Office 365 integration for v1; files are static uploads.
6. **Advanced Malware Scanning** — No virus scan on upload (P1 feature). Basic file type validation only.

---

## 4. User Stories

### Untuk Guru (Teacher)

- **US-S-T1:** Sebagai guru, saya ingin upload lesson materials (PDF, image) ke lesson saat membuat kursus, dengan progress bar dan confirmation, sehingga saya confident file ter-save.
  - Acceptance: Drag-drop + file input in lesson editor; show upload progress %; success toast; file accessible in student view.

- **US-S-T2:** Sebagai guru, saya ingin upload rubric document (PDF or spreadsheet) ke assignment, sehingga siswa bisa download dan understand grading criteria.
  - Acceptance: File upload field in assignment form; limit 10 MB; accepted types (PDF, XLSX, DOC); success confirmation.

- **US-S-T3:** Sebagai guru, saya ingin see list of all my uploaded files (lesson materials, rubrics, sample solutions) organized by course/assignment, sehingga saya bisa manage dan re-use.
  - Acceptance: "File Manager" page under teacher dashboard; list view with file name, size, date uploaded, associated course; search + sort; delete option.

- **US-S-T4:** Sebagai guru, saya ingin bulk delete old lesson materials (e.g., dari kursus archived), sehingga saya clean up storage dan reduce costs.
  - Acceptance: Select multiple files → delete button; confirmation dialog; success toast showing freed space.

### Untuk Siswa (Student)

- **US-S-S1:** Sebagai siswa, saya ingin download lesson materials (PDF, image) yang diupload guru, dengan single click, sehingga saya bisa belajar offline.
  - Acceptance: File listed in lesson page; download button; file opens/downloads in browser; works on mobile.

- **US-S-S2:** Sebagai siswa, saya ingin upload assignment submission (document, photo, video) dengan progress tracking, sehingga saya confident it's submitted.
  - Acceptance: Drag-drop or file picker in assignment submission form; show upload %; success confirmation with file name + timestamp.

- **US-S-S3:** Sebagai siswa, saya ingin see my submitted files untuk past assignments, dengan ability re-download, sehingga saya keep copy untuk portfolio.
  - Acceptance: "My Submissions" page or per-assignment submission history; list files; download + view timestamps; organized by assignment.

### Untuk Admin Sekolah (Admin)

- **US-S-A1:** Sebagai admin, saya ingin see storage quota usage (total storage, % used, warning when >80%), sehingga saya dapat monitor costs.
  - Acceptance: Admin dashboard card "Storage Usage"; show X GB of Y GB used; usage bar; link to "Storage Settings" untuk set quota limits.

- **US-S-A2:** Sebagai admin, saya ingin set storage quota limit per school (e.g., 50 GB), dan block new uploads if exceeded, sehingga saya control costs.
  - Acceptance: Admin settings page "Storage Quota"; input field for limit; warning email ke teachers when >80%; block upload with error message when exceeded.

- **US-S-A3:** Sebagai admin, saya ingin see which teachers/courses using most storage, sehingga saya dapat advise cleanup.
  - Acceptance: Storage breakdown report; table: course name, teacher, storage used, last accessed. Export CSV.

---

## 5. Requirements

### P0 — Must Have

| #   | Requirement                      | Acceptance Criteria                                                                                                                                                                                                                |
| --- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Supabase Storage Integration** | Create Storage buckets per tenant (or single bucket with tenant-scoped paths). Configure RLS policies: users can only read/write files in their tenant_id path. Example path: `/tenants/{tenantId}/lessons/{lessonId}/{filename}`. |
| 2   | **Secure File Paths & RLS**      | Storage paths enforce tenant isolation via pattern: `/tenants/{tenantId}/**`. RLS policy: `tenant_id` in JWT claim matches bucket path. Zero cross-tenant access.                                                                  |
| 3   | **File Upload Service (API)**    | `uploadFile(file, destinationPath, onProgress)` — handles: file validation (type, size), upload to Supabase Storage, progress callback, retry logic on failure. Returns file URL + metadata.                                       |
| 4   | **File Size Limits**             | Enforce per-file limits: lesson materials (50 MB), assignment rubrics (10 MB), student submissions (100 MB). Return validation error with user-friendly message.                                                                   |
| 5   | **Upload Progress Tracking**     | Show upload progress % in UI (real-time); update as file uploads. Use `XMLHttpRequest` progress event or Supabase SDK's progress callback (if available).                                                                          |
| 6   | **File Type Validation**         | Whitelist allowed file types per context: Lessons (PDF, PNG, JPG), Submissions (PDF, DOCX, JPG, PNG, MP4), Rubrics (PDF, XLSX). Validate before upload; reject with clear error.                                                   |
| 7   | **Signed URLs for Download**     | Files in private bucket require signed/temporary URLs for download. Service generates short-lived URL (1-hour expiry) via `supabase.storage.from().createSignedUrl()`.                                                             |
| 8   | **File Delete Service**          | `deleteFile(filePath)` removes file from storage. Soft-delete: also mark file metadata as deleted (deleted_at timestamp) in DB. Hard-delete only after retention period.                                                           |
| 9   | **File Metadata Tracking**       | Table `file_uploads`: file_id, tenant_id, uploader_id (user), file_path, original_filename, file_size_bytes, mime_type, uploaded_at, deleted_at, associated_feature (lesson/assignment/submission).                                |
| 10  | **Storage Usage Tracking**       | Table `storage_usage`: tenant_id, total_bytes_used, updated_at (updated daily via DB trigger or cron job). Query to check quota limit.                                                                                             |
| 11  | **Quota Enforcement**            | Table `storage_quotas`: tenant_id, max_bytes (default 50 GB). On upload, check: if current_usage + new_file_size > quota, reject with error message.                                                                               |
| 12  | **File Retention Policy**        | Auto-cleanup old student submissions after retention period (configurable, default 90 days). Use pg_cron to delete files marked `deleted_at` older than retention period.                                                          |
| 13  | **File Manager UI (Teacher)**    | Page: list of teacher's uploaded files (lessons, rubrics) organized by course. Search, sort by date/size. Delete with confirmation. Show file size stats.                                                                          |
| 14  | **Dark Mode Support**            | All file upload UI, progress bars, file managers support dark mode with `dark:` Tailwind variants.                                                                                                                                 |
| 15  | **Mobile Responsive**            | File upload form responsive on mobile; progress bar readable on small screens. File manager list scrollable; touch targets >44px.                                                                                                  |
| 16  | **Documentation**                | Create `src/features/storage/README.md` with: service API, usage examples, quota setup, RLS policies. Update `docs/DATABASE.md` with tables + schema.                                                                              |

### P1 — Nice to Have

| #   | Requirement                           | Reasoning                                                                                                                                                               |
| --- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Resumable Uploads**                 | For large files (>50 MB), support resumable uploads (tus.io or AWS Multipart). User can pause/resume if connection drops. Deferred: complex UX, backend implementation. |
| 2   | **File Preview (Images, PDFs)**       | Embed image/PDF preview in modal without external library. Use `<img>` for images, PDF.js for PDFs. Deferred: P1.                                                       |
| 3   | **Drag-Drop Upload**                  | Drag file(s) to designated drop zone; triggers upload. Enhanced UX vs. file picker.                                                                                     |
| 4   | **Bulk Upload**                       | Upload multiple files at once; show progress for each. Deferred: UX complexity.                                                                                         |
| 5   | **Storage Usage Analytics Dashboard** | Admin view: storage breakdown by course, teacher, feature. Chart: storage over time. Export CSV. Deferred: analytics work.                                              |
| 6   | **File Versioning**                   | Keep file version history (e.g., teacher upload lesson material v1, then update to v2). Keep both versions; student can access older versions. Deferred: DB complexity. |
| 7   | **Sharing via Link**                  | Generate public shareable link for specific file (with expiry). Teachers share rubrics outside system. Deferred: public access policy.                                  |
| 8   | **Virus/Malware Scan**                | Scan uploaded files (Virustotal API or ClamAV) before storing. Block infected files. Deferred: external API integration, cost.                                          |
| 9   | **OCR on PDF**                        | Extract text from uploaded PDFs for better search + accessibility. Deferred: external API (Google Cloud Vision).                                                        |

### P2 — Future Considerations

| #   | Item                                                | Reasoning                                                                                                        |
| --- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1   | **End-to-End Encryption**                           | Encrypt files at application layer (before upload); decrypt on download. Deferred: Phase 6 (security hardening). |
| 2   | **Third-Party Cloud Sync (Google Drive, OneDrive)** | Allow import/export files from external clouds. Deferred: OAuth + sync logic.                                    |
| 3   | **Backup & Disaster Recovery**                      | Backup Supabase Storage to secondary cloud (AWS S3 archive). Deferred: operations decision.                      |
| 4   | **CDN for Fast Delivery**                           | Files served via Cloudflare or AWS CloudFront. Deferred: caching layer.                                          |

---

## 6. Success Metrics

### Leading Indicators (hari–minggu)

| Metric                              | Target                                               | Cara Ukur                                                                                           |
| ----------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Upload Success Rate**             | 99% of file uploads succeed on first attempt         | Count successful_uploads / total_upload_attempts.                                                   |
| **Upload Performance (p50)**        | 50% of uploads complete in <5 sec (for <10 MB files) | Measure upload duration via client-side timing.                                                     |
| **File Type Validation Accuracy**   | 100% of invalid file types rejected                  | Manually test with 10 invalid file types; verify rejection.                                         |
| **Quota Enforcement**               | 100% of uploads rejected when tenant exceeds quota   | Test by filling quota to max, then attempting upload; verify rejection.                             |
| **Storage Usage Tracking Accuracy** | storage_usage table matches actual bucket size       | Compare `storage_usage.total_bytes_used` with `SELECT SUM(metadata->>'size') FROM storage.objects`. |

### Lagging Indicators (minggu–bulan)

| Metric                                   | Target                                                | Cara Ukur                                                                                    |
| ---------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **Lesson Material Upload Rate**          | 80% of courses have ≥1 lesson material uploaded       | `SELECT COUNT(DISTINCT course_id) WHERE file_count >= 1` / total_courses.                    |
| **Student Submission Rate**              | 90% of assigned students upload submission            | `SELECT COUNT(DISTINCT user_id) WHERE submission_uploaded = TRUE` / total_assigned_students. |
| **Average Storage per Tenant**           | 2–5 GB per active school                              | Median of `storage_usage.total_bytes_used` across all tenants.                               |
| **Storage Cost Reduction (via Cleanup)** | 15% reduction in total storage used after cleanup job | Compare month-over-month storage_usage (pre/post cleanup).                                   |
| **File Manager Usage Rate**              | 40% of teachers use file manager per month            | Count unique teacher_id in `file_manager_visited` events / active_teachers.                  |

---

## 7. Open Questions

| #   | Pertanyaan                                                                                       | Owner       | Blocking?                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | Should we use single Storage bucket for all tenants (path-scoped) or separate bucket per tenant? | Engineering | Tidak — single bucket with path-scoped RLS is simpler + cheaper. Separate buckets in P1 if isolation concern.         |
| 2   | What's the default storage quota per school? 50 GB, 100 GB, unlimited?                           | Product     | Ya — recommend 50 GB default (covers ~500 students × 100 KB per submission). Configurable per contract.               |
| 3   | Should we delete student submissions automatically after 90 days, or keep forever (expensive)?   | Product     | Tidak — v1: keep for 90 days (compromise); admin can configure retention. GDPR-compliant deletion.                    |
| 4   | Should we scan uploaded files for viruses? If so, which service (Virustotal, ClamAV)?            | Security    | Tidak — v1 no scan (cost + latency). Basic file type validation sufficient. P1 feature.                               |
| 5   | For file size limits, should we be per-file or aggregate per submission?                         | Engineering | Tidak — per-file limits sufficient (50 MB lesson, 10 MB rubric, 100 MB submission). Aggregate limit (quota) separate. |

---

## 8. Timeline & Phases

### Phase 1: Foundation (Week 1)

- [ ] Supabase Storage bucket setup + RLS policies
- [ ] Database schema: `file_uploads`, `storage_usage`, `storage_quotas`
- [ ] File upload service + validation logic
- [ ] Signed URL generation for downloads

### Phase 2: Core Upload Features (Week 2)

- [ ] Upload progress tracking UI
- [ ] File type + size validation
- [ ] Success/error notifications
- [ ] Integration into lesson editor, assignment form

### Phase 3: File Management & Quota (Week 3)

- [ ] Teacher file manager UI
- [ ] Storage quota enforcement
- [ ] Storage usage tracking + admin dashboard
- [ ] File deletion + retention policy

### Phase 4: Polish & Launch (Week 4)

- [ ] Dark mode + responsive audit
- [ ] Performance testing (large file uploads)
- [ ] Cleanup job testing (pg_cron)
- [ ] Documentation + UAT

---

## 9. Dependensi & Risiko

### Dependensi

| Dependensi           | Status  | Impact                                                              |
| -------------------- | ------- | ------------------------------------------------------------------- |
| Supabase Storage     | ✅ Live | Core dependency for file storage. Already part of Supabase project. |
| Supabase Auth + RLS  | ✅ Live | Needed for tenant-scoped access control.                            |
| React Query v5       | ✅ Live | Cache file metadata queries.                                        |
| pg_cron (PostgreSQL) | ✅ Live | Scheduled cleanup of old files.                                     |

### Risiko & Mitigasi

| Risiko                                                                                                   | Severity | Mitigasi                                                                                                 |
| -------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| **Storage Cost Explosion** — Unlimited uploads cause AWS/GCP bill overrun.                               | High     | Enforce quota per tenant; cleanup old files every 90 days; monitor daily costs. Alert CFO if >threshold. |
| **Cross-Tenant File Access (Security)** — Bug in RLS policy allows Sekolah A to read Sekolah B's files.  | Critical | Thoroughly test RLS policies (10 test cases); code review by security; penetration test.                 |
| **Large File Upload Timeout** — 100 MB file upload fails due to request timeout.                         | Medium   | Implement resumable upload (P1) or increase timeout; test with real 100 MB file.                         |
| **File Deletion Integrity** — Soft-delete marks file deleted but doesn't clean up storage; blob remains. | Medium   | Hard-delete old files after retention period via pg_cron; verify storage freed.                          |
| **Quota Check Race Condition** — Concurrent uploads both succeed even though combined > quota.           | Low      | Acquire lock on `storage_usage` row before checking + updating.                                          |
| **File Manager Performance** — Listing 10k+ files slow/times out.                                        | Low      | Paginate file list (20 per page); index on `tenant_id, uploaded_at`.                                     |
| **Mobile Upload Failure** — Upload interrupts due to network switch (WiFi → cellular).                   | Medium   | Implement retry logic (3 attempts with exponential backoff); show error message. P1: resumable uploads.  |

---

## 10. Acceptance Criteria for V1 Launch

**Teacher:**

- [ ] Can upload lesson material to lesson editor (<50 MB)
- [ ] Can upload rubric to assignment (<10 MB)
- [ ] See upload progress bar (0–100%)
- [ ] Receive success/error notification
- [ ] Can access File Manager and list own files
- [ ] Can delete files with confirmation

**Student:**

- [ ] Can download lesson material with single click
- [ ] Can upload assignment submission (<100 MB)
- [ ] See upload progress %
- [ ] Can download own submissions from "My Submissions"

**Admin:**

- [ ] Can see storage usage (X/Y GB) on dashboard
- [ ] Can set storage quota limit
- [ ] Can see warning when >80% quota used
- [ ] Can view storage breakdown by course/teacher

**Technical:**

- [ ] File paths enforce tenant isolation (RLS policies tested)
- [ ] Storage quota enforced (reject upload when exceeded)
- [ ] Storage usage tracked accurately in DB
- [ ] File retention cleanup runs automatically
- [ ] Dark mode working on upload UI
- [ ] Mobile responsive file upload + file manager
- [ ] No N+1 queries on file list (paginated)
- [ ] Documentation updated (`docs/DATABASE.md`, feature README)

---

## 11. Implementation Notes for Engineers

### Database Schema

```sql
-- File upload metadata
CREATE TABLE file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path VARCHAR NOT NULL (path in Supabase Storage, e.g., /tenants/{tenantId}/lessons/{id}/{filename}),
  original_filename VARCHAR NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type VARCHAR,
  associated_feature VARCHAR (lesson, assignment_rubric, assignment_submission, profile_picture),
  associated_id UUID (lesson_id, assignment_id, etc.),
  uploaded_at TIMESTAMP DEFAULT now(),
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT now(),

  CONSTRAINT deleted_soft UNIQUE (id) WHERE deleted_at IS NULL
);

-- Storage usage tracking (aggregate per tenant)
CREATE TABLE storage_usage (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  total_bytes_used BIGINT DEFAULT 0,
  last_calculated_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Storage quotas (configurable per tenant)
CREATE TABLE storage_quotas (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  max_bytes_allowed BIGINT DEFAULT 53687091200 (50 GB),
  warning_threshold_percent INT DEFAULT 80,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Enable RLS
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_quotas ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view file uploads in their tenant"
  ON file_uploads FOR SELECT
  USING (tenant_id = (SELECT get_my_tenant_id()));

CREATE POLICY "Users can delete own file uploads"
  ON file_uploads FOR UPDATE
  USING (
    (uploader_id = auth.uid() OR
     (auth.uid() IN (SELECT user_id FROM user_roles WHERE role = 'admin' AND tenant_id = file_uploads.tenant_id)))
    AND tenant_id = (SELECT get_my_tenant_id())
  );
```

### File Upload Service

```typescript
// src/features/storage/api/uploadService.ts

interface UploadOptions {
  file: File
  destinationPath: string
  onProgress?: (progress: number) => void
}

interface UploadResult {
  fileUrl: string
  filePath: string
  fileSize: number
}

export const uploadFile = async (options: UploadOptions): Promise<UploadResult> => {
  const { file, destinationPath, onProgress } = options

  // Validate file
  validateFileSize(file)
  validateFileType(file)

  // Check quota
  const usage = await checkStorageQuota(tenantId)
  if (usage.current + file.size > usage.max) {
    throw new Error(`Storage quota exceeded. ${usage.available} bytes remaining.`)
  }

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage.from('edusync').upload(destinationPath, file, {
    cacheControl: '3600',
    upsert: false,
    onUploadProgress: (progress) => {
      const percentComplete = (progress.loaded / progress.total) * 100
      onProgress?.(percentComplete)
    },
  })

  if (error) throw error

  // Record in DB
  await recordFileUpload({
    filePath: data.path,
    originalFilename: file.name,
    fileSizeBytes: file.size,
    mimeType: file.type,
    associatedFeature: extractFeatureFromPath(destinationPath),
  })

  // Generate signed URL
  const { data: signedUrl } = await supabase.storage
    .from('edusync')
    .createSignedUrl(data.path, 3600) // 1 hour expiry

  return {
    fileUrl: signedUrl.signedUrl,
    filePath: data.path,
    fileSize: file.size,
  }
}
```

### Feature Module Structure

```
src/features/storage/
├── api/
│   ├── uploadService.ts (uploadFile, deleteFile)
│   ├── storageService.ts (quota checks, usage tracking)
│   └── fileService.ts (fetch file metadata)
├── queries/
│   ├── storageKeys.ts
│   └── storageQueries.ts (useUploadedFiles, useStorageUsage)
├── hooks/
│   ├── useFileUpload.ts (manage upload state + progress)
│   ├── useStorageQuota.ts (fetch quota + usage)
│   └── useFileDelete.ts
├── types/
│   └── index.ts (FileUpload, StorageUsage, StorageQuota)
├── components/
│   ├── FileUploadInput.tsx (form input with progress)
│   ├── FileManager.tsx (teacher file browser)
│   ├── StorageUsageCard.tsx (admin dashboard)
│   ├── UploadProgressBar.tsx
│   └── FileList.tsx
├── __tests__/
│   └── uploadService.test.ts
└── README.md
```

---

## Glossary

| Term               | Definisi                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| **File Upload**    | Proses mengirim file dari client ke Supabase Storage.                                              |
| **Signed URL**     | Temporary URL dengan limited access; expires after time period. Secure way to serve private files. |
| **Storage Quota**  | Max total storage allowed per tenant (e.g., 50 GB). Enforced on upload.                            |
| **Storage Usage**  | Current total bytes used by tenant; tracked in DB; updated daily.                                  |
| **File Retention** | Policy untuk auto-delete old files (e.g., submissions older than 90 days).                         |
| **RLS Policy**     | PostgreSQL row-level security rule; restricts file access per tenant_id.                           |
| **Multi-Tenant**   | Data isolation per school/organization; users from Sekolah A cannot access Sekolah B's files.      |
