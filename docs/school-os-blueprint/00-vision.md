# 00 — Vision: EduSync sebagai School OS

## Thesis

Sekolah Indonesia hari ini menjalankan operasionalnya dengan **4–7 sistem terpisah**: LMS (Google Classroom/Moodle), administrasi (Excel/Dapodik), keuangan (spreadsheet SPP), komunikasi orang tua (WhatsApp manual), PPDB (form manual/Google Form), ujian (kertas/CBT pihak ketiga), dan rapor (manual). Data tidak mengalir antar sistem; guru input ulang; kepala sekolah tidak punya visibilitas realtime.

**EduSync School OS** = satu platform terintegrasi tempat semua data akademik, administratif, dan komunikasi sekolah mengalir dalam satu graf data. Bukan "LMS dengan fitur tambahan" — ini **sistem operasi sekolah** di mana setiap modul saling memperkaya.

## Definisi: apa beda "School OS" dari "LMS"?

| Dimensi | LMS Tradisional | School OS |
|---|---|---|
| Scope | Pengajaran (kursus, kuis, tugas) | Pengajaran + administrasi + keuangan + komunikasi + pelaporan |
| Data | Terisolasi per modul | Graf terhubung (attendance → gradebook → rapor → parent notif → principal dashboard, otomatis) |
| User roles | Guru + siswa | Guru, siswa, orang tua, admin TU, kepala sekolah, yayasan/pengawas |
| Output | Nilai + log aktivitas | Rapor Kurmer, laporan AKM, export Dapodik, laporan BOS, sertifikat, analytics executive |
| AI | Chatbot/quiz generator terpisah | AI terjalin di setiap surface: assessment adaptif, deteksi kesulitan, rekomendasi intervensi, auto-grading, insight kepala sekolah |

## Prinsip desain

1. **One source of truth per entitas** — satu siswa, satu nilai, satu catatan kehadiran. Tidak ada duplikasi antar modul.
2. **Event-driven integration** — ketika modul A terjadi (siswa submit quiz), modul B/C/D **otomatis** bereaksi (gradebook update, XP, notifikasi, struggle detection). Kontrak integrasi eksplisit.
3. **Modular, bukan monolitik** — setiap modul bisa di-disable per sekolah via `tenant_modules` feature flags. Sekolah SD tidak butuh LTI; SMK butuh modul magang. Core tetap utuh.
4. **AI sebagai lapisan horisontal**, bukan fitur terpisah. AI membantu di setiap workflow (authoring, grading, tutoring, intervensi, insight) — bukan menu tersendiri yang terlupakan.
5. **Indonesia-first** — UI bahasa Indonesia, istilah lokal (rapor bukan "report card"), kalender tahun ajaran (Juli-Juni), struktur kelas (X, XI, XII / VII, VIII, IX), kurikulum (Kurmer + KTSP), integrasi Dapodik, WhatsApp untuk orang tua, pembayaran (Midtrans/Xendit/bank transfer), rapor PDF sesuai format Kemdikbud.
6. **Tenant-isolation ketat** — satu instance = banyak sekolah; data sekolah A tidak bisa bocor ke sekolah B. Bermodal multi-tenant yang sudah ada (`tenant_id` di semua tabel + auth middleware).
7. **Offline-tolerant** — daerah dengan koneksi lemah harus bisa pakai. PWA, local-first cache, sync ketika online. (Belum ada; lihat gap-analysis.)
8. **Audit-ready** — setiap perubahan data krusial (nilai, kehadiran, pembayaran) tercatat di audit log dengan aktor, waktu, before/after.

## Target segmen

**Primary**: SD, SMP, SMA, SMK di Indonesia dengan 100–2000 siswa yang ingin digitalisasi operasional end-to-end. Ukuran ini cukup besar untuk butuh sistem terintegrasi, tapi tidak dilayani ERP enterprise (SAP SuccessFactors) yang overkill.

**Secondary**: Bimbingan belajar, homeschool, pesantren modern, boarding school.

**Not serving**: Universitas/perguruan tinggi (butuh SIAKAD yang berbeda), lembaga kursus mikro (<50 siswa — Google Classroom cukup).

## Non-goals

- **Bukan** social network siswa. Forum/SocialHub yang ada tujuannya pedagogis (diskusi kelas), bukan Instagram.
- **Bukan** MOOC platform. Fokus formal schooling, bukan self-paced public courses (walaupun secara teknis bisa).
- **Bukan** replacement untuk Dapodik. Dapodik tetap sistem nasional; EduSync export + sync, tidak menggantikan.
- **Bukan** ERP perguruan tinggi. Tidak ada KRS, SKS, registrasi mata kuliah pilihan.

## Metrik sukses (North Star)

- **School activation**: % sekolah yang >80% gurunya login mingguan dalam 30 hari pertama
- **Data coherence**: % event siswa (submit quiz, absen) yang berhasil update semua modul hilir (gradebook, rapor, notif ortu) dalam <10 detik
- **Parent engagement**: % orang tua yang buka notif/rapor mingguan
- **Teacher time saved**: self-reported jam/minggu yang dihemat dari admin manual
- **Principal insight**: % kepala sekolah yang lihat executive dashboard >3×/minggu

## Open questions

- Model bisnis: freemium, per-siswa/bulan, atau lump-sum per sekolah/tahun? Memengaruhi arsitektur billing.
- Integrasi Dapodik: read-only sync, two-way sync, atau export-only?
- Sekolah negeri vs swasta: butuh variant fitur (laporan BOS khusus negeri)?
- Mobile-first atau web-first? Saat ini web-first + responsive. Guru Indonesia banyak pakai HP. Perlu native app atau PWA cukup?
