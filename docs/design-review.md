# EduSync LMS — Design Critique & Accessibility Review

**Tanggal:** 21 Maret 2026
**Halaman yang diaudit:** Login, Student Dashboard, Course Detail (light & dark mode)
**Standar:** WCAG 2.1 AA

---

## Design Critique

### Overall Impression

UI EduSync sudah bersih dan modern dengan card-based layout yang jelas. Color scheme biru-hijau konsisten dan cocok untuk konteks pendidikan. Informasi tersusun dengan hierarchy yang baik. Masalah terbesar ada di **dark mode yang belum sepenuhnya diimplementasi** dan beberapa inkonsistensi data/label.

### Usability

| Finding                                                                                       | Severity    | Recommendation                                                                     |
| --------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------- |
| Kelas "b ing" dengan guru "Guru" — nama tidak informatif                                      | 🟡 Moderate | Pastikan seed data menggunakan nama realistis (misal: "Kelas 10-A IPA", "Bu Sari") |
| "Module 3" masih pakai nama default, 0 pelajaran                                              | 🟡 Moderate | Sembunyikan modul kosong atau tampilkan badge "Coming Soon"                        |
| Angka "2" di icon Module 3 — seharusnya "3" jika itu modul ketiga                             | 🟡 Moderate | Gunakan index modul yang benar, atau gunakan icon konsisten (checkmark/angka urut) |
| "Sosial & Info" di sidebar — ambigu untuk user                                                | 🟢 Minor    | Ganti dengan label lebih spesifik seperti "Forum & Pengumuman"                     |
| "Estimasi XP ~50 XP" di card sertifikat — terlalu kecil dan kurang kontras                    | 🟢 Minor    | Perbesar font atau beri badge warna yang lebih mencolok                            |
| Onboarding 3 langkah tidak bisa di-skip sekaligus                                             | 🟢 Minor    | Tambahkan tombol "Lewati" di samping "Lanjut"                                      |
| Tombol "Lanjut Belajar" — apakah membawa ke lesson terakhir atau course overview? Tidak jelas | 🟢 Minor    | Tambahkan tooltip atau subtitle kecil: "Lanjut ke Persamaan Linear"                |

### Visual Hierarchy

- **Apa yang pertama menarik mata:** Header gradient biru "Selamat malam, Student!" — ini benar karena memberikan sambutan personal
- **Reading flow:** Header → XP bar → Kelas → Tugas deadline — flow logis dari atas ke bawah
- **Emphasis:** Tombol "Lanjut Belajar" (ungu) dan progress bar 100% (hijau) menjadi focal point yang tepat di halaman course
- **Whitespace:** Penggunaan spacing antar card sudah baik, tidak terasa cramped

### Consistency

| Element       | Issue                                                                                                                   | Recommendation      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Card radius   | Semua card konsisten rounded — bagus                                                                                    | Tidak ada perubahan |
| Icon style    | Modul selesai pakai checkmark hijau, modul belum pakai angka abu-abu — konsisten                                        | Tidak ada perubahan |
| Sidebar icons | Lucide icons konsisten di semua item                                                                                    | Tidak ada perubahan |
| Button style  | "Lanjut Belajar" (ungu gradient) vs "Gabung Kelas" (outline biru) — perbedaan jelas antara primary dan secondary action | Tidak ada perubahan |
| Header bar    | Streak, level badge, XP bar, dark mode toggle, notif, avatar — konsisten di semua halaman                               | Tidak ada perubahan |

### What Works Well

- **Gamification bar** di header (streak, level, XP) — selalu visible dan memotivasi
- **Progress card** dengan 3 metrics (Pelajaran, Estimasi Sisa, Status) — informatif tanpa overwhelming
- **Sertifikat card** dengan link langsung ke Profil — rewarding
- **Bahasa Indonesia** konsisten di seluruh UI — tidak ada English leak
- **Login page** dengan dev quick login buttons — sangat membantu development

---

## Dark Mode Review

### Temuan Kritis

| Finding                                 | Severity    | Detail                                                                                                                  |
| --------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Cards tetap putih di dark mode          | 🔴 Critical | Card course detail, progress bar, dan modul list tidak berubah warna — kontras terlalu tinggi terhadap background gelap |
| Sidebar tidak berubah ke dark           | 🔴 Critical | Background sidebar tetap putih, text color tidak berubah                                                                |
| Teks dalam card tetap gelap             | 🟡 Moderate | Deskripsi kursus, nama pengajar, label "Pelajaran", "Estimasi Sisa" tetap warna gelap — readable tapi inkonsisten       |
| Sertifikat card border tetap hijau muda | 🟢 Minor    | Border hijau muda kurang kontras di dark background                                                                     |

### Rekomendasi Dark Mode

Semua komponen yang menggunakan `bg-white` perlu ditambahkan `dark:bg-gray-800` atau `dark:bg-slate-800`. Ini termasuk card containers, sidebar, dan module list items. Pastikan juga text color di-flip: `text-gray-900 dark:text-gray-100`.

---

## Accessibility Audit (WCAG 2.1 AA)

### Summary

**Issues found:** 11 | **Critical:** 2 | **Major:** 5 | **Minor:** 4

### Perceivable

| #   | Issue                                                                                                | WCAG                       | Severity    | Recommendation                                                  |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------- | ----------- | --------------------------------------------------------------- |
| 1   | Dark mode: card backgrounds tidak berubah, menyebabkan kontras buruk antara card dan page background | 1.4.3 Contrast             | 🔴 Critical | Implementasikan dark: variants untuk semua card components      |
| 2   | "Estimasi XP ~50 XP" teks sangat kecil (~12px) dengan warna abu-abu muda                             | 1.4.3 Contrast             | 🟡 Major    | Perbesar ke min 14px, gunakan warna dengan kontras lebih tinggi |
| 3   | Sub-text modul ("3 pelajaran · 45 min") menggunakan warna abu-abu muda                               | 1.4.3 Contrast             | 🟢 Minor    | Verify kontras ratio >= 4.5:1 terhadap background               |
| 4   | Tidak ada `<footer>` landmark                                                                        | 1.3.1 Info & Relationships | 🟢 Minor    | Tambahkan `<footer>` atau `role="contentinfo"`                  |

### Operable

| #   | Issue                                                                            | WCAG                   | Severity | Recommendation                                                                                                                     |
| --- | -------------------------------------------------------------------------------- | ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 5   | Dark mode toggle button tidak memiliki visible text label                        | 2.4.7 Focus Visible    | 🟡 Major | Sudah ada aria-label "Toggle dark mode" — bagus, tapi tambahkan tooltip on hover                                                   |
| 6   | Module list items — tidak jelas apakah seluruh row clickable atau hanya chevron  | 2.1.1 Keyboard         | 🟡 Major | Pastikan seluruh row bisa diklik dan di-focus via keyboard dengan visible focus ring                                               |
| 7   | Onboarding modal — tidak bisa di-dismiss dengan Escape key (belum ditest)        | 2.1.2 No Keyboard Trap | 🟡 Major | Implementasikan Escape key handler untuk close modal                                                                               |
| 8   | Heading hierarchy — hanya ada H1 "EduSync" yang terdeteksi di landmark structure | 2.4.6 Headings         | 🟡 Major | Pastikan "Matematika Kelas 10", "Progres Belajar", "Daftar Modul" menggunakan proper heading tags (H2, H3) bukan hanya styled divs |

### Understandable

| #   | Issue                                                                              | WCAG                | Severity | Recommendation                                                                          |
| --- | ---------------------------------------------------------------------------------- | ------------------- | -------- | --------------------------------------------------------------------------------------- |
| 9   | "Sosial & Info" sidebar label — tidak deskriptif                                   | 3.2.4 Consistent ID | 🟢 Minor | Gunakan label yang lebih jelas                                                          |
| 10  | Progress "Selesai!" menggunakan warna hijau saja tanpa icon — color-only indicator | 1.4.1 Use of Color  | 🟢 Minor | Sudah ada teks "Selesai!" yang menyertainya — acceptable, tapi tambahkan checkmark icon |

### Robust

| #   | Issue                                                                                          | WCAG                    | Severity    | Recommendation                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------- | ----------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| 11  | Page title berubah-ubah antara "Dashboard — EduSync", "EduSync", dan "My Google AI Studio App" | 4.1.2 Name, Role, Value | 🔴 Critical | Fix document title — "My Google AI Studio App" jelas salah, kemungkinan dari Vite config default yang belum diubah |

### ARIA Landmarks

| Landmark                  | Present? | Notes   |
| ------------------------- | -------- | ------- |
| `<main>`                  | ✅       | Ada     |
| `<nav>`                   | ✅       | Ada     |
| `<header>` / banner       | ✅       | Ada     |
| `<aside>` / complementary | ✅       | Sidebar |
| `<footer>` / contentinfo  | ❌       | Missing |

### Keyboard Navigation (Observasi)

| Element                 | Accessible?         | Notes                                              |
| ----------------------- | ------------------- | -------------------------------------------------- |
| Sidebar links           | ✅                  | Navigable via Tab                                  |
| "Lanjut Belajar" button | ✅                  | Focusable                                          |
| Dark mode toggle        | ✅                  | Has aria-label                                     |
| Module list items       | ⚠️ Perlu verifikasi | Pastikan ada focus ring dan keyboard enter handler |
| Onboarding modal        | ⚠️ Perlu verifikasi | Cek focus trap dan Escape dismiss                  |

---

## Priority Recommendations

### 🔴 Critical (Fix Immediately)

1. **Fix page title** — "My Google AI Studio App" harus diubah ke "EduSync" di `index.html` atau Vite config. Ini yang paling mudah di-fix dan paling embarrassing kalau sampai production.

2. **Fix dark mode cards** — Semua komponen dengan `bg-white` harus punya `dark:` variant. Tanpa ini, dark mode lebih merusak UX daripada membantu.

### 🟡 Major (Fix Before Launch)

3. **Heading hierarchy** — Gunakan proper `<h2>`, `<h3>` tags bukan styled divs untuk judul course, section headers, dll. Penting untuk screen readers.

4. **Module row keyboard accessibility** — Pastikan seluruh row clickable dan menampilkan focus ring saat di-Tab.

5. **Seed data cleanup** — "b ing", "Module 3" tanpa nama, nama guru "Guru" — perbaiki seed data agar demo terlihat profesional.

### 🟢 Minor (Nice to Have)

6. Tambahkan `<footer>` landmark
7. Tambahkan tooltip untuk dark mode toggle
8. Rename "Sosial & Info" ke sesuatu yang lebih deskriptif
9. Tambahkan "Lewati" button di onboarding flow

---

_Review dilakukan oleh Claude (Cowork) menggunakan Design plugin — accessibility-review dan design-critique skills._
