# UX Decision Rules

Kontrak kerja untuk semua perubahan UX di EduSync. Semua perubahan kode harus mengikuti aturan ini.

---

## 1. Setiap screen wajib punya 1 Primary Action

- ✅ Setiap halaman hanya boleh ada **satu aksi utama yang paling jelas**
- ✅ Primary Action selalu menggunakan `variant="primary"`
- ✅ Posisi selalu paling mudah dijangkau: paling atas, atau paling bawah (sticky)
- ✅ Semua aksi lain harus menggunakan variant secondary/ghost
- ❌ Jangan pernah ada 2 button primary di halaman yang sama

## 2. Decision Point Reduction

- ✅ Kurangi jumlah pilihan di setiap langkah menjadi maksimal 3 pilihan
- ✅ Jika ada >3 opsi, sisanya sembunyikan dibalik "More options"
- ✅ Setiap aksi utama harus bisa dijalankan dalam maksimal **2 klik dari dashboard**
- ❌ Jangan biarkan user berpikir "harus klik apa dulu?"

## 3. Next Action First

- ✅ Di semua halaman, tampilkan **apa yang harus dilakukan user SEKARANG** di posisi teratas
- ✅ Baru setelah itu tampilkan informasi pendukung
- ✅ Jangan pernah letakkan informasi dekoratif di atas aksi yang dibutuhkan user
- ❌ Jangan tampilkan leaderboard sebelum continue learning button

## 4. State UX Guarantee

Setiap komponen, section, dan halaman WAJIB punya 4 state dengan urutan prioritas:

1.  ✅ Error State + recovery action
2.  ✅ Loading State (skeleton)
3.  ✅ Empty State + action
4.  ✅ Success / Data State

Urutan render harus selalu sama di seluruh aplikasi.

## 5. Click Cost Budget

| Journey                            | Maksimal klik |
| ---------------------------------- | ------------- |
| Dashboard → Mulai belajar          | 1 klik        |
| Dashboard → Mulai kuis             | 1 klik        |
| Dashboard → Koreksi tugas          | 1 klik        |
| Selesai lesson → Lesson berikutnya | 1 klik        |
| Submit jawaban → Lihat hasil       | 1 klik        |

Setiap tambahan klik di atas budget ini adalah bug UX.

## 6. Consistency Rules

- ✅ Copywriting CTA harus sama persis di seluruh aplikasi
- ✅ Posisi button primary selalu di kanan bawah
- ✅ Skeleton loading selalu memiliki animasi yang sama
- ✅ Empty state selalu punya icon, title, deskripsi, dan 1 action button

## 7. User Trust Principle

- ✅ Selalu beritahu user apa yang sedang terjadi
- ✅ Selalu berikan konfirmasi sebelum aksi destruktif
- ✅ Jangan pernah biarkan user ragu apakah data sudah tersimpan
- ✅ Semua operasi async harus ada indikator loading
