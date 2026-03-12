# EduSync Data Ownership Rules

Dokumen ini mendefinisikan secara tegas struktur kepemilikan data *(Data Ownership)* di dalam arsitektur EduSync LMS. 
Aturan ini sangat penting untuk dipatuhi demi mencegah adanya ambiguitas relasional saat data saling berinteraksi, dan memastikan Row Level Security (RLS) serta logika penghapusan *(Data Deletion / Cascade)* berjalan dengan aman.

---

## 🏗️ Aturan Dasar (Global Rules)

1. **Top-Level Ownership:** Segala sesuatu bermuara pada entitas **Tenant (School)**. Jika tenant dihapus secara konseptual, seluruh rantai kelembagaan di bawahnya akan secara spesifik terisolasi atau dihilangkan *(hard / soft delete bergantung pada regulasi/compliance)*.
2. **Strict RLS Scope:** Semua kebijakan RLS (Row Level Security) wajib menelusuri ke atas **sampai mentok ke entitas pemilik logisnya** jika ingin membuktikan akses (misal: "Apakah user X merupakan `TEACHER` dari `class_id` yang memiliki tugas `assignment_id` ini?").
3. **No Direct Orphaning:** Data tidak boleh "mengambang". Jika entitas parent dipindahkan atau dinonaktifkan, state ownership data cabangnya tidak boleh kehilangan track id pemilik.

---

## 🧩 Hierarki Kepemilikan (Entity Ownership Tree)

### 🏫 Academic & Logistics
*   `academic_units` → dimiliki oleh **`tenant`**
*   `academic_terms` → dimiliki oleh **`tenant`**
*   `subjects` → dimiliki oleh **`tenant`**
*   `courses` → dimiliki oleh **`tenant`** (sebagai aset kurikulum institusi)
*   `classes` → dimiliki oleh gabungan **`academic_unit`** dan diampu oleh **`teacher` (user)**

### 📚 Learning Content
*   `course_modules` → dimiliki oleh **`course`**
*   `lessons` → dimiliki oleh **`course_module`**
*   `lesson_resources` → dimiliki oleh **`lesson`**
*   `lesson_comments` → dikontribusikan (ditulis) oleh **`user` (student/teacher)** namun menempel di **`lesson`**

### 📝 Assessment & Submissions
*   `assignments` → dimiliki oleh **`class`** (bukan course, karena penugasan itu spesifik per gelombang/kelas KBM)
*   `rubrics` → dimiliki oleh **`assignment`** (atau `tenant` jika ingin di-reuse secara global)
*   `quizzes` → dimiliki oleh **`class`** 
*   `quiz_questions` → dimiliki oleh **`quiz`**
*   `quiz_options` → dimiliki oleh **`quiz_question`**
*   **Hak Milik Murid (Protected Origin):**
    *   `assignment_submissions` → mutlak secara data privacy dimiliki oleh **`student` (user)**. Guru hanya bisa melihat dan menilai, bukan mengedit substansi karya.
    *   `quiz_attempts` & `quiz_answers` → mutlak dimiliki oleh **`student` (user)**.

### 📊 Grades & Progress
*   `grades` → diotorisasi dan ditulis oleh **`teacher` (grader_id)**, tetapi dialamatkan (milik logis) pada sebuah `submission_id`.
*   `rubric_scores` → otoritas dari `teacher`, melekat di laporan `submission` milik siswa.
*   `lesson_progress` & `course_progress` → dimiliki sepenuhnya oleh **`student` (user)**.

### 💬 Social & Interaction
*   `discussion_forums` → dimiliki oleh **`class`**
*   `discussion_threads` → ditulis oleh **`author`**, dimiliki oleh wadah **`discussion_forum`**
*   `discussion_posts` → dimiliki oleh **`author_id`** (Hanya author atau Admin yang biasanya boleh mengedit/menghapus isinya).

### ⚡ Events & Gamification
*   `activity_events` → entitas sistem independen (Immutable). "Dicetuskan" (triggered) oleh `actor_id` (User), pada scope **`tenant`**.
*   `points_ledger` → kepemilikan absolut sistem (Immutable), merujuk sebagai jejak nilai tukar kepada **`user`**.
*   `user_points` → precomputed state, dimiliki **`user`**.
*   `user_badges` → achievement, dimiliki **`user`**.

---

## 🔒 Konsekuensi Praktis (Implementation Guidelines)

1. **Delete Cascades:**
   Apabila seorang guru menghapus `Class`, maka:
   *   `Enrollments` (Keanggotaan) terhapus
   *   `Assignments` terhapus → namun apakah `Submissions` dan file tugas murid di Storage harus dihapus (cascade) atau di-soft-delete untuk keperluan perundang-undangan historis? Ini penting dipertimbangkan dalam schema DDL.

2. **Cross-Boundary Protection:**
   Halaman daftar *submission* guru tidak boleh sekadar melakukan:
   `SELECT * FROM assignment_submissions WHERE assignment_id = X`
   Melainkan secara arsitektural di RLS:
   `... WHERE assignment_id IN (SELECT id FROM assignments WHERE class_id IN (SELECT id FROM classes WHERE teacher_id = auth.uid()))`

3. **Data Portability:**
   Apabila `course` diduplikasi untuk Tahun Ajaran / `term` baru, yang diduplikasi **hanyalah kepemilikan Tenant/Course**, bukan `progress` (karena progress menempel di _Student_, bukan di silabus course itu sendiri).

Arsitektur Data Ownership ini menjamin EduSync menjadi sistem yang presisi secara relasional dan tahan banting ketika harus diaudit oleh standard keamanan.
