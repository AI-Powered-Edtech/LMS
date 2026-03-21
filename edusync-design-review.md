# Design Critique & Accessibility Review — EduSync LMS

**Tanggal:** 21 Maret 2026
**Standard:** WCAG 2.1 AA
**Halaman yang diaudit:** Login, Student Dashboard, Course Detail
**Mode:** Light + Dark

---

## Overall Impression

EduSync punya visual yang bersih dan modern — layout jelas, warna konsisten, dan hierarki informasi logical. Untuk LMS sekolah Indonesia, ini sudah di atas rata-rata. Tapi ada beberapa masalah yang perlu ditangani, terutama **dark mode yang rusak** dan beberapa gap accessibility.

---

## Design Critique

### Usability

| Finding                                                                 | Severity    | Recommendation                                          |
| ----------------------------------------------------------------------- | ----------- | ------------------------------------------------------- |
| "Module 3" masih pakai nama default, 0 pelajaran                        | 🟡 Moderate | Sembunyikan modul kosong atau beri label "Segera Hadir" |
| Icon nomor di Module 3 menunjukkan "2" padahal ini module ke-3          | 🟡 Moderate | Perbaiki numbering logic — harus menampilkan angka "3"  |
| "Sosial & Info" di sidebar ambigu                                       | 🟢 Minor    | Rename ke "Forum & Pengumuman" atau split jadi 2 menu   |
| "Estimasi XP ~50 XP" di card sertifikat sangat kecil, mudah terlewat    | 🟢 Minor    | Perbesar font atau beri visual emphasis (badge/pill)    |
| Sidebar hanya 5 menu — tidak ada akses langsung ke Courses dari sidebar | 🟡 Moderate | Tambahkan "Kursus Saya" di sidebar navigation           |

### Visual Hierarchy

- **Yang menarik mata pertama:** Hero banner "Selamat malam Student!" — ini benar, memberikan konteks personal
- **Reading flow:** Header → XP bar → Kelas → Deadline — logical dan efektif
- **Emphasis:** CTA "Lanjut Belajar" di course detail sangat menonjol (warna biru kontras) — bagus
- **Progress bar 100% hijau** sangat jelas dan satisfying — good UX

### Consistency

| Element           | Issue                                                                           | Recommendation                                                     |
| ----------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Card radius       | Sebagian rounded-xl, sebagian rounded-lg                                        | Standarkan ke satu ukuran (rounded-xl)                             |
| Gamification bar  | Di header (kecil) dan di dashboard (besar) — duplikasi info                     | Pilih satu lokasi utama, yang lain jadi tooltip/hover              |
| Module card icons | Completed pakai checkmark hijau, incomplete pakai angka abu — inkonsisten style | Gunakan style yang sama: angka untuk semua, atau checkmark overlay |

### What Works Well

- Hero banner dengan sapaan personal + waktu hari sangat warm dan engaging
- Progress tracking (5/5 selesai, Estimasi Sisa, Status) sangat informatif dalam satu baris
- Sertifikat tersedia card dengan link langsung ke Profil — great affordance
- Color palette biru-hijau-oranye konsisten dan ramah mata
- Login page dengan DEV QUICK LOGIN buttons sangat membantu developer experience

---

## Accessibility Audit

**Issues found:** 9 | **Critical:** 2 | **Major:** 4 | **Minor:** 3

### Perceivable

| #   | Issue                                                                                                                               | WCAG            | Severity    | Recommendation                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | --------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| 1   | Dark mode tidak berfungsi — background berubah gelap tapi card, sidebar, dan progress bar tetap light theme. Teks jadi sulit dibaca | 1.4.3 Contrast  | 🔴 Critical | Tambahkan `dark:` variant ke semua komponen. Audit setiap card, sidebar, header, dan form element               |
| 2   | Tidak ada `<footer>` / `contentinfo` landmark                                                                                       | 1.3.1 Structure | 🟢 Minor    | Tambahkan semantic `<footer>` dengan info copyright/links                                                       |
| 3   | Hanya ada 1 heading (H1 "EduSync") — konten halaman tidak punya H2/H3                                                               | 1.3.1 Structure | 🟡 Major    | Tambahkan heading hierarchy: H2 untuk section titles (Kelas Saya, Tugas Mendekati Deadline), H3 untuk sub-items |

### Operable

| #   | Issue                                                                 | WCAG                    | Severity | Recommendation                                                                                           |
| --- | --------------------------------------------------------------------- | ----------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| 4   | Dark mode toggle button tidak punya visible label — hanya icon        | 2.4.6 Headings & Labels | 🟢 Minor | Sudah ada aria-label "Toggle dark mode" — cukup. Tapi tambahkan tooltip on hover                         |
| 5   | Sidebar navigation items tidak menunjukkan halaman aktif dengan jelas | 2.4.3 Focus Order       | 🟡 Major | Tambahkan `aria-current="page"` dan visual indicator yang lebih kuat (background highlight, left border) |
| 6   | Keyboard focus indicator tidak terlihat pada beberapa elemen          | 2.4.7 Focus Visible     | 🟡 Major | Tambahkan `focus-visible:ring-2 focus-visible:ring-blue-500` ke semua interactive elements               |

### Understandable

| #   | Issue                                                                       | WCAG                       | Severity | Recommendation                                                                   |
| --- | --------------------------------------------------------------------------- | -------------------------- | -------- | -------------------------------------------------------------------------------- |
| 7   | Onboarding modal tidak bisa di-skip langsung — harus klik "Lanjut" 3 kali   | 3.2.1 On Focus             | 🟡 Major | Tambahkan tombol "Lewati" atau "X" close button di onboarding modal              |
| 8   | Empty state "Tidak ada tugas mendesak" pakai icon warning (⚠️) — misleading | 3.3.1 Error Identification | 🟢 Minor | Ganti icon ke checkmark hijau karena ini positive state (semua tugas terkendali) |

### Robust

| #   | Issue                                                                       | WCAG                    | Severity    | Recommendation                                                                                        |
| --- | --------------------------------------------------------------------------- | ----------------------- | ----------- | ----------------------------------------------------------------------------------------------------- |
| 9   | Heading hierarchy flat — screen reader users tidak bisa navigate by section | 4.1.2 Name, Role, Value | 🔴 Critical | Implementasi proper heading levels di semua halaman. Setiap section card harus punya semantic heading |

### Color Contrast Check (Light Mode)

| Element                                | Foreground | Background       | Status                                                               |
| -------------------------------------- | ---------- | ---------------- | -------------------------------------------------------------------- |
| Hero text "Student!"                   | White      | Blue gradient    | ✅ Pass                                                              |
| Body text                              | Dark slate | White            | ✅ Pass                                                              |
| Sidebar links                          | Muted blue | White            | ✅ Pass                                                              |
| "Selesai!" green text                  | Green      | White card       | ⚠️ Perlu verifikasi — hijau muda di background putih bisa borderline |
| "~50 XP"                               | Light gray | Light green card | ⚠️ Kemungkinan gagal — teks sangat kecil dan low contrast            |
| Module subtitle "3 pelajaran · 45 min" | Gray       | White/green card | ⚠️ Perlu verifikasi                                                  |

### Color Contrast Check (Dark Mode)

| Element         | Status                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| Seluruh halaman | ❌ **GAGAL TOTAL** — dark mode tidak diterapkan ke card content, menghasilkan white cards di dark background |

---

## Priority Recommendations

1. **🔴 Fix Dark Mode (Critical)** — Ini masalah terbesar. Semua komponen butuh `dark:` Tailwind variants. Card backgrounds harus `dark:bg-gray-800`, text harus `dark:text-gray-100`, borders harus `dark:border-gray-700`. Test setiap halaman di dark mode setelah fix.

2. **🔴 Heading Hierarchy (Critical)** — Tambahkan H2 untuk setiap section ("Kelas Saya", "Tugas Mendekati Deadline", "Progres Belajar", "Daftar Modul") dan H3 untuk sub-items. Ini critical untuk screen reader navigation.

3. **🟡 Onboarding Skip Button (Major)** — Tambahkan tombol "Lewati" di onboarding modal. User yang sudah pernah melihat onboarding seharusnya bisa skip langsung.

4. **🟡 Sidebar Active State (Major)** — Perkuat visual indicator untuk halaman aktif di sidebar. Tambahkan `aria-current="page"`.

5. **🟡 Focus Indicators (Major)** — Audit semua button, link, dan card — pastikan ada visible focus ring saat keyboard navigation.

6. **🟡 Tambahkan "Kursus Saya" ke Sidebar** — Salah satu halaman terpenting (courses) tidak bisa diakses langsung dari sidebar.

7. **🟢 Empty State Icon** — Ganti ⚠️ di "Tidak ada tugas mendesak" ke ✅ — ini positive state, bukan warning.

8. **🟢 Module Numbering** — Fix numbering bug di Module 3 yang menampilkan angka "2".
