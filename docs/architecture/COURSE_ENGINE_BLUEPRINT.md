# COURSE ENGINE BLUEPRINT
**EduSync LMS — End-to-End Learning System Architecture**

> **Status:** DRAFT v1.0  
> **Dibuat:** 2026-03-09  
> **Penulis:** EduSync Engineering Team  
> **Tujuan:** Dokumen ini adalah _sumber arsitektur utama_ untuk Course Builder, Lesson Blocks, Activity System, Assessment Engine, dan Progress Tracking. Dokumen lain seperti `DOMAIN_MAP.md` dan `DATABASE_SCHEMA.md` mengacu ke blueprint ini.

---

## 1. System Philosophy

EduSync dibangun di atas prinsip **Block-Based Learning System** — pendekatan modular di mana setiap materi pelajaran terdiri dari _blok konten_ yang dapat dikombinasikan secara bebas, mirip konsep Notion atau modern MOOC editor.

**Tiga keputusan arsitektur kunci:**

| Keputusan | Pilihan EduSync | Alasan |
|---|---|---|
| Data ownership | Database-first (Supabase RLS) | Keamanan multi-tenant terjamin di layer DB |
| Activity grading | PostgreSQL RPC | Transaksional, atomic, low-latency |
| Content delivery | Block references (`block_ref_id`) | Block editor tetap generic, activity tetap modular |

---

## 2. Hierarki Entitas Pembelajaran

```
Tenant (School)
 └── Course
      └── Class         ← Enrollments terhubung di sini
           └── Module
                └── Lesson
                     └── LessonBlock (lesson_resources)
                          ├── type: video      → (url di lesson_resources)
                          ├── type: text       → (content di lesson_resources)
                          ├── type: quiz       → block_ref_id → quizzes.id
                          └── type: assignment → block_ref_id → assignments.id (Future)
```

**Kunci desain:** `LessonBlock` adalah lapisan **generic orchestration**. Setiap block hanya menyimpan `type` dan `block_ref_id`. Data spesifik (soal quiz, file attachment, dll.) disimpan di tabel masing-masing domain.

---

## 3. Course Builder Architecture

Alur kerja Teacher/Admin saat membangun materi:

```
CourseBuilder Page
   ↓ state dikelola BuilderContext
LessonBlockEditor
   ↓ dispatch addBlock(type)
courseBuilderService
   ↓ INSERT lesson_resources (type, order_index)
Supabase DB
```

Untuk block bertipe `quiz`:
```
QuizBlockEditor (mounted saat block.type = QUIZ)
   ↓ load: getQuizByLesson(lessonId)
   ↓ save: saveQuizData(lessonId, classId, tenantId, quizData)
courseBuilderService → Supabase (quizzes, quiz_questions, quiz_options)
```

> **Catatan Skalabilitas:** Operasi `saveQuizData` saat ini multi-round-trip. Untuk production skala besar, gantikan dengan **RPC `save_quiz_builder()`** yang menjalankan seluruh operasi dalam satu transaksi DB.

---

## 4. Assessment Engine

### 4.1 Flow Student (Quiz)

```
[Student] Buka Lesson → Smart Player menampilkan QuizViewer
          ↓
[Klik Mulai] → RPC start_quiz_attempt()
          ↓ Validasi: enrolled? max_attempts? sudah ada attempt in_progress?
          ↓ INSERT quiz_attempts (status = in_progress, started_at = now())
          ↓
[Isi Jawaban] → State lokal di React (tidak ada request ke DB)
          ↓
[Klik Kirim] → RPC submit_quiz_attempt(attempt_id, answers[])
          ↓ Validasi: time_limit? status = in_progress?
          ↓ Score dihitung, status = submitted/graded
          ↓ Activity event dipicu (QUIZ_COMPLETED)
[Tampil hasil] ← score, passed, time_spent
```

### 4.2 Security Checklist pada RPC

| Pemeriksaan | Detail |
|---|---|
| **Tenant Isolation** | `quiz.tenant_id = auth.jwt()->>tenant_id` |
| **Enrollment Check** | Student harus terdaftar di class terkait quiz |
| **Attempt Lock** | Cegah submit ganda: `status != in_progress → REJECT` |
| **Replay Attack** | Attempt yang sudah `submitted/expired` tidak bisa disubmit ulang |
| **Time Limit** | `now() - started_at > time_limit_minutes + grace → mark EXPIRED` |
| **Max Attempts** | Hitung jumlah attempt sebelumnya, tolak jika ≥ `quizzes.max_attempts` |

### 4.3 Status State Machine — `quiz_attempts.status`

```
             ┌──────────┐
  [Mulai] ──►│in_progress│──[Timeout]──►│expired│
             └────┬─────┘              └───────┘
                  │ [Submit]
                  ▼
             ┌──────────┐
             │submitted │──[Auto/Manual grade]──►│graded│
             └──────────┘                        └──────┘
```

---

## 5. Versioning Strategy

**Masalah:** Jika teacher mengedit soal quiz setelah siswa sudah ada yang mengerjakan, data historis bisa tidak konsisten (soal berubah, tapi jawaban lama masih referensi soal lama).

**Solusi (Target Fase 2):**

```sql
-- Tabel baru
quiz_versions (
  id         uuid PK,
  quiz_id    uuid → quizzes.id,
  version    integer,
  snapshot   jsonb,    -- seluruh quiz + questions + options di-snapshot
  created_at timestamptz
)

-- Modifikasi quiz_attempts
quiz_attempts (
  ...
  quiz_version_id uuid → quiz_versions.id   -- ← tambah kolom ini
)
```

**Alur:** Setiap kali teacher mem-`publish` quiz, sistem membuat satu `quiz_version` baru. `start_quiz_attempt` selalu menggunakan `version` terbaru. Hasil penilaian historis tetap bisa dirender dari snapshot versi lampau.

---

## 6. Draft vs Published Workflow

Setiap entitas konten memiliki siklus status:

```
DRAFT → PUBLISHED → ARCHIVED
```

| Status | Visibilitas | Edit? |
|---|---|---|
| `DRAFT` | Hanya Teacher/Admin | ✅ Bebas diedit |
| `PUBLISHED` | Tampil ke Student | ⚠️ Edit → buat versi baru |
| `ARCHIVED` | Tersembunyi | ❌ Read-only |

**Implementasi saat ini:**
- `lessons.is_published` (boolean → akan migrasi ke `status` enum)
- `quizzes` — belum ada kolom `status` (**→ target Fase 2**)

**Publish Guard (validasi sebelum publish quiz):**
- Jumlah soal ≥ 1
- Setiap soal memiliki minimal 2 opsi
- Setiap soal memiliki minimal 1 jawaban benar

---

## 7. Course Progress Engine (Phase 3)

Progress dihitung pada level database untuk meminimalisasi perhitungan _on-the-fly_ di frontend.

### 7.1 Sumber Data Progress

| Aksi Siswa | Aksi | Update Tabel |
|---|---|---|
| Membaca article/video | `upsert` pada `lesson_progress` via Edge/Service | `lesson_progress.completed = true` |
| Mengirim kuis | `submit_quiz_attempt` RPC | `lesson_progress.completed = true` |
| Perubahan `lesson_progress`| DB Trigger `on_lesson_progress_completed` | Memanggil `recompute_course_progress()` (Optimized: fires only on false -> true transition) |
| RPC `recompute_course_progress`| Upsert `course_progress` | Memperbarui `completed_lessons` & `percentage` |

### 7.3 Performance Hardening (Phase 3)

Untuk memastikan sistem siap produksi, beberapa optimasi dilakukan:
- **Index Optimization**: Menambahkan index komposit pada `lesson_progress(user_id, completed)` dan `course_progress(user_id, last_activity_at desc)` untuk mempercepat render dashboard.
- **Trigger Guard**: Trigger `on_lesson_progress_completed` diperbarui agar hanya berjalan saat status `completed` berubah dari `false` ke `true`, mencegah "trigger storm" saat update progress video yang sering.
- **Data Bundling**: Penambahan RPC `get_student_progress_bundle(p_student_id)` yang menggabungkan Profile, XP, Lesson Count, Quiz Attempts, Achievements, dan Course Progress dalam satu call (mengurangi request dari 6 menjadi 1).

### 7.2 Data Flow Pipeline & Tabel

```
[Activity]                    [Progress]                     [Analytics]
quiz_attempts                 lesson_progress                course_stats
    │                               │                              ▲
    │ (RPC submit_quiz)             │ (DB Trigger)                 │
    ▼                               ▼                              │ (Periodic RPC)
lesson_progress ─────────────► course_progress ────────────────────┘
```

> **Aturan Emas:** Frontend Dashboard Siswa hanya membaca `course_progress` (O(1) lookup). Dilarang menghitung `COUNT(lesson_progress)` via client.

---

## 8. Gradebook Architecture

Teacher melihat rekap nilai siswa melalui Gradebook.

**Data yang dibutuhkan:**

```
quiz_attempts   → score, passed, time_spent, submitted_at, status
quiz_answers    → detail jawaban per soal
enrollments     → daftar siswa di kelas
```

**Tampilan Gradebook (target):**

| Siswa | Judul Quiz | Skor | Lulus | Waktu | Percobaan |
|---|---|---|---|---|---|
| Budi | Kuis Aljabar | 85/100 | ✅ | 12 menit | 1 dari 3 |
| Sari | Kuis Aljabar | 55/100 | ❌ | 20 menit | 2 dari 3 |

**Implementasi:** Query langsung ke `quiz_attempts` + join `enrollments`. Untuk skala besar, pertimbangkan materialized view `gradebook_summary`.

---

## 9. Learning Analytics Engine (Phase 3C) & Event Tracking

### 9.1 Pre-Aggregated Stats (`course_stats`)

Untuk mendukung *Teacher Analytics Dashboard* dengan performa tinggi, metrik diagregasi ke dalam tabel consumer `course_stats`.

```
Dashboard ◄── (RPC get_teacher_analytics) ◄── course_stats ◄── (RPC refresh_course_stats)
```

**Aturan Emas:** Dilarang melakukan komputasi berat (_full table scan_ `lesson_progress` / `quiz_attempts`) saat dashboard dirender. Statistik harus dibaca dari `course_stats` yang diperbarui secara asinkron atau terjadwal.

### 9.2 Data Event Bus (`activity_events`)

Selain progress dasar, semua interaksi _raw_ dicatat di `activity_events` untuk audit, gamification, atau AI modeling:

```sql
activity_events (
  id           uuid,
  tenant_id    uuid,
  event_type   text,      -- 'QUIZ_COMPLETED', 'LESSON_STARTED', dst
  event_version integer,  -- untuk evolusi schema payload
  actor_id     uuid,      -- user yang melakukan aksi
  payload      jsonb,     -- data spesifik event
  created_at   timestamptz
)
```

### 9.2 Event Penting LMS

| Event | Dipicu oleh | Payload utama |
|---|---|---|
| `LESSON_STARTED` | Student buka lesson | `lesson_id, course_id` |
| `VIDEO_PLAYED` | Player event | `lesson_id, timestamp` |
| `QUIZ_ATTEMPTED` | `start_quiz_attempt` RPC | `quiz_id, attempt_id` |
| `QUIZ_SUBMITTED` | `submit_quiz_attempt` RPC | `quiz_id, score, passed` |
| `QUIZ_EXPIRED` | RPC time check | `quiz_id, attempt_id` |
| `LESSON_COMPLETED` | DB Trigger (semua block selesai) | `lesson_id, student_id` |
| `COURSE_COMPLETED` | DB Trigger (semua lesson selesai) | `course_id, student_id` |

### 9.3 Event Retention Policy (3-Tier)

```
Hot   (0–90 hari)  → activity_events         ← Query aktif
Warm  (90d–1 thn)  → activity_events_archive ← Periodic move via pg_cron
Cold  (>1 tahun)   → Supabase Storage (JSONL) ← Analitik historis / ML
```

---

## 10. Multi-Tenant Security

Semua tabel pembelajaran **wajib** memiliki `tenant_id`. RLS memastikan isolasi data antar sekolah.

**Pola RLS standar:**
```sql
-- Enable RLS
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: hanya user dari tenant yang sama yang bisa baca
CREATE POLICY "tenant_isolation" ON quizzes
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Pemeriksaan wajib setiap penambahan tabel baru:**
- [ ] Kolom `tenant_id` ada?
- [ ] RLS diaktifkan (`ENABLE ROW LEVEL SECURITY`)?
- [ ] Policy SELECT/INSERT/UPDATE/DELETE sudah dibuat?
- [ ] RPC yang mengakses tabel ini sudah validasi `tenant_id`?

---

## 11. Future AI Layer

Data yang sudah terkumpul dari `quiz_attempts`, `lesson_progress`, dan `activity_events` siap menjadi input untuk AI Tutor.

**Potensi fitur:**

| Fitur | Data Source | Mekanisme |
|---|---|---|
| Adaptive Quiz | `quiz_answers` (jawaban salah) | LLM generate soal baru berdasar topik lemah |
| Weak Topic Detection | `quiz_attempts` (score rendah) | Analisis per `quiz_questions.topic_tag` |
| Learning Path Recommendation | `lesson_progress` | Collaborative filtering |
| Auto Remediation | `activity_events` | Edge Function → rekomendasi lesson |

> **Catatan:** Tambahkan kolom `topic_tag text[]` pada `quiz_questions` untuk mendukung deteksi topik lemah di masa depan.

---

## 12. Roadmap Implementasi

| Fase | Fitur | Status |
|---|---|---|
| **Fase 1** | Quiz DB schema, RPC grading, Security (enrollment, attempt lock, time limit) | ✅ Selesai |
| **Fase 1** | Student Quiz Viewer + Frontend Integration | ✅ Selesai |
| **Fase 1** | Teacher Quiz Builder UI (`QuizBlockEditor`) | ✅ Selesai |
| **Fase 2** | Quiz `status` enum (draft/published/archived) | 🔲 Belum |
| **Fase 2** | Quiz Versioning (`quiz_versions` table) | 🔲 Belum |
| **Fase 2** | Atomic Save RPC `save_quiz_builder()` | 🔲 Belum |
| **Fase 3A**| Teacher Gradebook UI | ✅ Selesai |
| **Fase 3B**| Progress Tracking (event-driven, DB Trigger) | ✅ Selesai |
| **Fase 3C**| Learning Analytics Dashboard | ✅ Selesai |
| **Fase 4** | Assignment System (Teacher-graded assignments) | ✅ Selesai |
| **Fase 5** | AI Tutor Integration (Weak Topic Detection) | 🔲 Belum |

---

## 13. Dokumen Terkait

| Dokumen | Isi |
|---|---|
| [`DOMAIN_MAP.md`](../../DOMAIN_MAP.md) | Pemetaan domain entitas EduSync (abstrak) |
| [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) | Definisi SQL tabel dan kolom (implementasi) |
| [`FEATURE_TOGGLES.md`](./FEATURE_TOGGLES.md) | Sistem feature flag per tenant |
| [`SMART_PLAYER_V2_DATA_ARCH.md`](./SMART_PLAYER_V2_DATA_ARCH.md) | Arsitektur data Smart Player (Video Viewer) |

---

_Blueprint ini adalah dokumen hidup. Update wajib dilakukan setiap kali ada perubahan arsitektur signifikan pada Course Builder, Assessment Engine, atau Progress Tracking._
