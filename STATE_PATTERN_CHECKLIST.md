# State Pattern Checklist

Checklist untuk setiap komponen dan halaman. Semua halaman prioritas tinggi harus lulus checklist ini.

---

## ✅ Loading State Requirements

- [ ] Skeleton sesuai dengan bentuk konten asli
- [ ] Tidak ada pergeseran layout ketika loading selesai (CLS < 0.1)
- [ ] Skeleton tidak muncul jika data sudah di cache
- [ ] Loading tidak berlangsung lebih dari 3 detik tanpa feedback
- [ ] Tidak ada teks "Loading..." yang terlihat user

---

## ✅ Empty State Requirements

- [ ] Ada icon yang relevan
- [ ] Title jelas dan tidak ambigu
- [ ] Deskripsi menjelaskan **kenapa** kosong
- [ ] Ada **1 action button** yang jelas yang memberitahu apa yang harus dilakukan selanjutnya
- [ ] Tidak ada button "Close" atau "Dismiss"
- [ ] Empty state tidak terlihat seperti error

---

## ✅ Error State Requirements

- [ ] Pesan error menjelaskan apa yang salah dalam bahasa manusia
- [ ] Ada tombol "Coba lagi"
- [ ] Ada fallback action jika retry gagal
- [ ] Tidak menampilkan stack trace atau kode error ke user
- [ ] Error tidak merusak layout halaman
- [ ] User tidak perlu refresh halaman untuk memulihkan

---

## ✅ Success State Requirements

- [ ] Feedback visual yang jelas ketika aksi berhasil
- [ ] Feedback menghilang otomatis dalam 3 detik
- [ ] Ada indikasi apa yang terjadi selanjutnya
- [ ] Tidak memblokir user untuk melanjutkan aksi lain

---

## Halaman Prioritas Tinggi Yang Harus Lulus Checklist

| Halaman           | Loading | Empty | Error |
| ----------------- | ------- | ----- | ----- |
| Student Dashboard | ✅      | ⚠️    | ❌    |
| Teacher Dashboard | ✅      | ✅    | ❌    |
| Lesson Viewer     | ✅      | ⚠️    | ❌    |
| Quiz Player       | ✅      | ⚠️    | ⚠️    |
| Assignment Page   | ✅      | ⚠️    | ❌    |
| Gradebook         | ⚠️      | ⚠️    | ❌    |

---

## Status Implementasi Saat Ini

✅ = Sudah sesuai standar
⚠️ = Ada tapi belum konsisten
❌ = Belum ada
