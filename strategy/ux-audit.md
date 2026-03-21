# UX Audit & Improvement Recommendations — EduSync LMS

> Audit UX berdasarkan review codebase langsung. Mencakup flow utama dari login hingga lihat nilai.
> Terakhir diperbarui: Maret 2026

---

## 1. Audit Flow Utama: Login → Dashboard → Kursus → Quiz → Nilai

### 1.1 Login Flow (`Login.tsx`)

**Yang Sudah Baik:**

- Multi-step registration dengan visual step indicator yang jelas
- Sistem terjemahan error Supabase → Bahasa Indonesia yang sangat baik (`translateAuthError()`)
- Live class code lookup dengan validasi real-time
- Desain gradient yang profesional dengan card layout bersih
- Atribut `role="alert"` dan `aria-describedby` untuk aksesibilitas
- Rate limiting protection dengan feedback ke user
- Dev quick login untuk testing

**Friction Points:**

- Tidak ada validasi form saat mengetik (hanya muncul setelah submit) — user harus submit dulu untuk tahu salah
- Tidak ada password strength indicator — user tidak tahu apakah password cukup kuat
- Button loading state kurang jelas — hanya text berubah ke "Masuk..." dengan opacity, bukan spinner visual
- Class code lookup baru menunjukkan error setelah ≥5 karakter — tidak intuitif
- Tidak ada tombol "Kembali" dari step 2 registrasi
- Link forgot password tidak prominent di form login
- Tidak ada "Remember me" checkbox

**Rekomendasi:**

| #   | Improvement                                | Effort | Impact | Prioritas |
| --- | ------------------------------------------ | ------ | ------ | --------- |
| 1   | Tambah real-time form validation (on blur) | Low    | Tinggi | P0        |
| 2   | Tambah password strength meter             | Low    | Medium | P1        |
| 3   | Spinner di dalam button saat loading       | Low    | Medium | P1        |
| 4   | "Kembali" button di step 2 registrasi      | Low    | Medium | P1        |
| 5   | Forgot password link lebih visible         | Low    | Medium | P1        |

### 1.2 Dashboard Siswa (`Dashboard.tsx`)

**Yang Sudah Baik:**

- Welcome card dengan greeting berbasis waktu (pagi/siang/sore) — sangat personal
- Banyak empty state dengan CTA yang jelas
- Responsive grid: 1 kolom (mobile) → 2/3/4 kolom (desktop)
- Gradient header dengan desain menarik
- XP dan Streak card ditampilkan prominent
- Tab switching untuk tugas dengan status indicator
- Skeleton loading states saat fetch data
- Impersonation banner saat guru melihat sebagai siswa

**Friction Points:**

- **Dashboard terlalu padat** — 8+ section major sekaligus (kursus, tugas, achievements, pengumuman, leaderboard, hubs, progress widgets, dll). Siswa baru bisa overwhelmed.
- Empty state styling tidak konsisten — beberapa pakai komponen `EmptyState`, lainnya pakai plain text centered
- Skeleton tidak match layout final — `SkeletonCard` tidak responsif sesuai grid, menyebabkan layout shift
- Quiz Progress card selalu kosong (hardcoded empty state) — membingungkan
- Leaderboard snapshot hanya menampilkan diri sendiri, bukan ranking aktual — mismatch dengan judul
- "Lanjutkan Belajar" hanya menampilkan 4 kursus tanpa "lihat semua"
- Status dot tugas terlalu kecil (3x3 pixel) — sulit dilihat di mobile

**Rekomendasi:**

| #   | Improvement                                                                  | Effort | Impact        | Prioritas |
| --- | ---------------------------------------------------------------------------- | ------ | ------------- | --------- |
| 1   | Reorganisasi dashboard — prioritaskan 3-4 section utama, sisanya collapsible | Medium | Sangat Tinggi | P0        |
| 2   | Konsistenkan semua empty state pakai komponen EmptyState                     | Low    | Tinggi        | P0        |
| 3   | Fix skeleton agar match responsive grid                                      | Low    | Medium        | P1        |
| 4   | Hapus atau isi Quiz Progress card                                            | Low    | Low           | P1        |
| 5   | Leaderboard snapshot tampilkan top 3 + posisi user                           | Low    | Medium        | P1        |
| 6   | Tambah "Lihat Semua" di section kursus                                       | Low    | Medium        | P1        |
| 7   | Perbesar status dot tugas + tambah label text                                | Low    | Medium        | P1        |

### 1.3 Course & Lesson Flow (`LessonViewer.tsx`)

**Yang Sudah Baik:**

- Course browser menampilkan progress per modul dengan jelas
- Breadcrumb navigation untuk konteks
- Progress percentage dan lesson count ditampilkan
- Loading state dan error handling dengan retry
- Support multiple content types: video, article, quiz, assignment, multi-block
- Lesson sidebar untuk navigasi antar lesson

**Friction Points:**

- Tidak ada "Lanjutkan" button atau smart resume — setelah masuk kursus, siswa harus manual pilih modul
- Lesson locking ada di code (`isLessonLocked`) tapi tidak jelas secara visual kenapa lesson terkunci
- Tidak ada breadcrumb di banyak halaman — siswa kehilangan konteks di navigasi dalam
- Nested async calls bisa gagal tanpa error yang jelas

**Rekomendasi:**

| #   | Improvement                                                                    | Effort | Impact        | Prioritas |
| --- | ------------------------------------------------------------------------------ | ------ | ------------- | --------- |
| 1   | Tambah "Lanjutkan dari terakhir" button prominent di atas                      | Low    | Sangat Tinggi | P0        |
| 2   | Jelaskan kenapa lesson terkunci (tooltip: "Selesaikan lesson sebelumnya dulu") | Low    | Tinggi        | P0        |
| 3   | Tambah breadcrumb navigation di semua halaman                                  | Medium | Tinggi        | P1        |
| 4   | Tambah estimasi waktu per lesson/modul                                         | Low    | Medium        | P2        |
| 5   | Tambah learning objectives di awal setiap lesson                               | Low    | Medium        | P2        |

### 1.4 Quiz Flow (`Quiz.tsx`, `QuizPlayer`)

**Yang Sudah Baik:**

- Statistik quiz lengkap di atas: total, selesai, rata-rata skor, total poin
- Search dan filter per kelas
- Tab Available/Completed yang jelas
- Start Quiz Modal mencegah quiz tidak sengaja dimulai
- Timer dengan warna progress
- Question palette untuk navigasi
- Autosave setiap 30 detik — fitur kritis yang sangat baik
- Confetti animation saat lulus
- Quiz state recovery saat resume
- Rate limiting pada submission

**Friction Points:**

- Quiz tanpa soal ("Kuis Belum Memiliki Soal") baru ketahuan setelah dimulai — sangat frustrating
- `isOnline = true` di-hardcode — tidak ada deteksi offline yang sebenarnya
- Beberapa error handling pakai `alert()` native — tidak sesuai desain dan tidak bisa di-theme
- Max attempts limit ditampilkan dengan text kecil — user mungkin tidak sadar attempt sudah habis
- Timer format dan urgency indicator tidak jelas
- Tidak ada keyboard shortcut untuk navigasi antar soal

**Rekomendasi:**

| #   | Improvement                                                    | Effort | Impact        | Prioritas |
| --- | -------------------------------------------------------------- | ------ | ------------- | --------- |
| 1   | Cek jumlah soal sebelum user mulai quiz — disable start jika 0 | Low    | Sangat Tinggi | P0        |
| 2   | Implementasi deteksi online/offline yang sebenarnya            | Medium | Tinggi        | P0        |
| 3   | Ganti semua `alert()` dengan toast/modal component             | Low    | Medium        | P1        |
| 4   | Tampilkan max attempts prominent + sisa attempts               | Low    | Medium        | P1        |
| 5   | Timer urgency: kuning di <5 menit, merah di <1 menit           | Low    | Medium        | P1        |
| 6   | Keyboard shortcut: ←→ untuk navigasi soal                      | Low    | Low           | P2        |

### 1.5 Lihat Nilai (`Grades.tsx`, `Gradebook`)

**Yang Sudah Baik:**

- Daftar nilai per mata pelajaran tersedia
- Detail nilai per assessment (quiz, tugas, ujian)
- Trend nilai visible

**Friction Points:**

- Tidak ada visual trend sederhana (grafik naik/turun) di mobile view
- Tidak ada perbandingan dengan rata-rata kelas (context-less grade)
- Export nilai ke PDF/Excel tidak prominent

---

## 2. Onboarding Experience

### Status Saat Ini

EduSync memiliki **guidance system** (`src/features/guidance/`) dengan capabilities:

- Beberapa tipe guide: tooltip, banner, walkthrough, checkpoint
- Trigger types: on page enter, after delay, on idle
- Session-based dismissal
- Interaction tracking

### Masalah

Meskipun infrastruktur guidance ada, **tidak ada onboarding flow khusus untuk first-time user**. User baru (guru maupun siswa) langsung dilempar ke dashboard tanpa context. Ini terutama berbahaya untuk Bu Ratna (persona guru yang baru pertama kali pakai LMS).

### Rekomendasi

| #   | Improvement                                                                                      | Effort | Impact        | Prioritas |
| --- | ------------------------------------------------------------------------------------------------ | ------ | ------------- | --------- |
| 1   | **Guru**: Walkthrough 5 langkah — "Buat kursus pertama → Tambah siswa → Buat quiz → Lihat nilai" | Medium | Sangat Tinggi | P0        |
| 2   | **Siswa**: Quick tour — "Ini dashboard Anda → Lihat kursus → Coba quiz → Cek leaderboard"        | Medium | Tinggi        | P0        |
| 3   | Checklist onboarding di dashboard — "✅ Login pertama, ☐ Join kelas, ☐ Buka lesson pertama"      | Medium | Tinggi        | P1        |
| 4   | Video tutorial singkat (30-60 detik) per fitur utama                                             | Medium | Medium        | P2        |

---

## 3. Empty States

### Audit

EduSync memiliki komponen `EmptyState` reusable (`src/components/ui/EmptyState.tsx`) dengan icon, title, description, dan action button. Banyak halaman sudah menggunakannya, misalnya "Belum bergabung di kelas mana pun" di dashboard dengan CTA "Masukkan Kode Kelas".

### Masalah

1. **Penggunaan tidak konsisten** — Beberapa halaman (seperti Quiz.tsx) menggunakan plain text centered alih-alih komponen EmptyState. Ini membuat pengalaman tidak seragam.
2. **Pesan tidak konsisten** — Mix antara "Belum ada..." (belum) dan "Tidak ada..." (tidak ada) — memberi kesan berbeda (sementara vs permanen)
3. **Tidak ada perbedaan visual** antara "belum ada data karena baru" vs "error/gagal fetch"
4. **Tidak ada sugesti kontekstual** — Empty state di achievements tidak menjelaskan bagaimana cara mendapat achievement

### Rekomendasi

Standarisasi semua empty state:

- Selalu gunakan komponen `EmptyState`
- Pattern bahasa: "Belum ada [item]. [Penjelasan cara mendapatkan]."
- Selalu sertakan CTA yang actionable
- Bedakan warna/icon untuk "kosong" vs "error"

---

## 4. Error Handling

### Status Saat Ini

- `ErrorBoundary` (class-based) dan `ErrorFallback` tersedia
- Error messages dalam Bahasa Indonesia
- Retry button dan link ke home
- Dark mode support
- `role="alert"` untuk aksesibilitas

### Masalah

1. **Pesan error generik** — Tidak memberi tahu user apa yang sebenarnya salah
2. **Tidak ada error code/tracking ID** — User tidak bisa report issue secara spesifik
3. **Tidak ada diferensiasi error type** — "Koneksi terputus" terlihat sama dengan "Server error"
4. **Beberapa fitur pakai `alert()` native** — Tidak konsisten dengan desain
5. **Retry button hanya reset state** — Tidak refetch data

### Rekomendasi

| #   | Improvement                                         | Effort | Impact | Prioritas |
| --- | --------------------------------------------------- | ------ | ------ | --------- |
| 1   | Diferensiasi error: offline vs server vs validation | Medium | Tinggi | P0        |
| 2   | Ganti semua `alert()` dengan toast component        | Low    | Medium | P1        |
| 3   | Tambah error code + "Laporkan masalah" link         | Low    | Medium | P2        |
| 4   | Offline detection banner di header                  | Medium | Tinggi | P1        |

---

## 5. Navigation & Information Architecture

### Status Saat Ini

- Desktop: Sidebar dengan menu items difilter berdasarkan role
- Mobile: Bottom navigation dengan 6 item utama
- Header: streak, XP, level, dark mode toggle, notifikasi, profil

### Masalah

1. **Sidebar items tidak semua tersedia di mobile** — Bottom nav hanya 6 item, beberapa fitur tidak bisa diakses di mobile tanpa hamburger menu
2. **Tidak ada breadcrumb** di kebanyakan halaman — user kehilangan context navigasi
3. **Tidak ada search/command palette** — harus klik-klik manual untuk menemukan fitur
4. **Active state di sidebar kurang jelas** — tidak ada highlight yang kuat
5. **Tidak ada skip-to-content link** untuk keyboard accessibility

### Rekomendasi

| #   | Improvement                                             | Effort | Impact        | Prioritas |
| --- | ------------------------------------------------------- | ------ | ------------- | --------- |
| 1   | Tambah hamburger menu di mobile untuk akses semua fitur | Medium | Sangat Tinggi | P0        |
| 2   | Breadcrumb di semua halaman                             | Medium | Tinggi        | P1        |
| 3   | Command palette (Ctrl+K) untuk search fitur/kursus      | Medium | Medium        | P2        |
| 4   | Perjelas active state sidebar                           | Low    | Medium        | P1        |

---

## 6. Responsive & Mobile Design

### Status Saat Ini

- Responsive grid layouts dengan 3 breakpoints (sm, md, lg)
- Bottom nav khusus mobile dengan touch target 44px
- Sidebar hidden di mobile
- Text sizes responsif

### Masalah

1. **Tidak ada layout khusus tablet** — tablet mendapat layout desktop yang mungkin terlalu besar
2. **Form inputs tidak mobile-optimized** — tidak ada `inputmode="email"` atau numeric keyboard
3. **Bottom nav text bisa truncate** di layar kecil (max-width 64px)
4. **Tidak ada swipe gesture** — navigasi hanya lewat tap
5. **Safe area insets** hanya ada di BottomNav, belum di seluruh app

### Rekomendasi

| #   | Improvement                         | Effort | Impact | Prioritas |
| --- | ----------------------------------- | ------ | ------ | --------- |
| 1   | Tambah `inputmode` pada form inputs | Low    | Medium | P0        |
| 2   | Fix bottom nav text truncation      | Low    | Medium | P1        |
| 3   | Safe area insets di seluruh app     | Low    | Medium | P1        |
| 4   | Tablet breakpoint (1024px)          | Medium | Low    | P2        |

---

## 7. Best Practices dari Kompetitor

| Practice                       | Kompetitor               | Rekomendasi untuk EduSync                                |
| ------------------------------ | ------------------------ | -------------------------------------------------------- |
| **SpeedGrader**                | Canvas                   | EduSync sudah punya — pastikan mobile-friendly           |
| **Gemini AI assistant**        | Google Classroom         | AI Tutor sudah ada — tambah AI lesson planning           |
| **PowerBuddy reading level**   | Schoology                | Pertimbangkan AI reading level adjustment                |
| **Parent app terpisah**        | Canvas, Schoology        | Parent Portal sebagai view terpisah (bukan app terpisah) |
| **Standards alignment tags**   | Canvas, Google Classroom | Tag Capaian Pembelajaran Kurikulum Merdeka               |
| **Class tools** (screen share) | Google Classroom         | Pertimbangkan di fase advanced                           |
| **Portfolio tool**             | Canvas                   | Pertimbangkan untuk showcase karya siswa                 |
| **Drag-and-drop file submit**  | Google Classroom         | Tambah drag-drop di assignment submission                |

---

## 8. Ringkasan Prioritas

### Quick Wins (Effort rendah, Impact tinggi) — Target: 2 minggu

1. Konsistenkan semua empty state pakai komponen EmptyState
2. Tambah real-time form validation di Login
3. Cek soal sebelum quiz dimulai (disable jika 0 soal)
4. Tambah "Lanjutkan dari terakhir" button di course
5. Jelaskan kenapa lesson terkunci
6. Ganti semua `alert()` dengan toast
7. Tambah `inputmode` pada form inputs
8. Perbesar status indicator tugas

### Medium Priority — Target: 1-2 bulan

9. Reorganisasi dashboard (prioritaskan, collapsible sections)
10. Onboarding walkthrough untuk guru dan siswa baru
11. Breadcrumb navigation di semua halaman
12. Hamburger menu untuk mobile (akses semua fitur)
13. Offline detection + banner
14. Diferensiasi error type
15. Fix skeleton loading agar match grid

### Major Redesign — Target: 3-6 bulan

16. Customizable dashboard per user
17. Command palette search
18. Mobile-first redesign quiz player
19. Comprehensive error reporting system
20. Tablet-specific layouts

---

_Audit ini berdasarkan code review. Idealnya dilengkapi dengan usability testing langsung dengan 5-10 user per role (guru, siswa, admin) untuk validasi temuan dan prioritas._
