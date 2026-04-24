# 01 — Konteks Sekolah Indonesia

Ringkasan konteks operasional sekolah formal di Indonesia yang harus ditangani School OS. **Bukan** textbook; ini daftar kewajiban nyata sekolah yang memengaruhi arsitektur & fitur.

⚠️ Dokumen ini disusun dari training knowledge (cutoff Jan 2026). Detail regulasi berubah setiap kurikulum baru. **Validasi dengan sekolah mitra** sebelum komit fitur.

## 1. Struktur pendidikan formal

- **Jenjang**: PAUD → SD (6 th, kelas 1-6) → SMP (3 th, VII-IX) → SMA/SMK (3 th, X-XII)
- **Tahun ajaran**: Juli–Juni, dibagi 2 semester (ganjil: Juli–Des, genap: Jan–Juni)
- **Jam sekolah**: 5-6 hari/minggu, 6-8 jam pelajaran/hari (satu JP = 35-45 menit)
- **Status**: Negeri (pemerintah) vs Swasta (yayasan). Swasta dominan di SMA/SMK kota besar.

**Implikasi untuk EduSync:**
- Tabel `semesters` harus mendukung 2 term/tahun, tahun ajaran lintas kalender (2026-07 s/d 2027-06 = "TA 2026/2027")
- Struktur kelas harus tingkat (grade) + rombel (class section, "VII-A", "X-IPA-1")
- Dukung JP (jam pelajaran) sebagai unit jadwal

## 2. Kurikulum

- **Kurikulum Merdeka (Kurmer)** — default sejak 2022/2023 progressive rollout; full implementation 2024/2025
  - Fase A (SD 1-2), B (SD 3-4), C (SD 5-6), D (SMP), E (SMA X), F (SMA XI-XII)
  - Capaian Pembelajaran (CP) → Alur Tujuan Pembelajaran (ATP) → Modul Ajar
  - Asesmen: diagnostik, formatif, sumatif
  - Projek Penguatan Profil Pelajar Pancasila (P5) — lintas mapel, 20-30% alokasi
- **KTSP 2013** — masih dipakai sekolah yang belum migrasi
- Mata pelajaran inti: PAI/Agama, PKn, Bahasa Indonesia, Matematika, IPA, IPS, Bhs Inggris, Seni, PJOK, Informatika, Muatan Lokal

**Implikasi:**
- Course/lesson harus bisa di-tag ke CP + ATP + fase kurikulum
- Asesmen: dukung 3 jenis (diagnostik/formatif/sumatif) sebagai first-class attribute, bukan tag
- P5: butuh modul project berbasis tema lintas mapel, peer/self-assessment, portofolio siswa
- Struktur mapel harus fleksibel (setiap sekolah punya muatan lokal berbeda)

## 3. Asesmen & Rapor

- **Rapor Kurmer**: narasi + nilai; dibagi Intrakurikuler (per mapel, capaian per CP), Kokurikuler (P5), Ekstrakurikuler
- **Nilai**: tidak lagi murni angka 0-100; ada deskriptor kualitatif (Berkembang, Sesuai Harapan, Sangat Berkembang)
- **AKM (Asesmen Kompetensi Minimum)**: literasi + numerasi, diselenggarakan Kemdikbud via ANBK
- **ANBK (Asesmen Nasional Berbasis Komputer)**: sampel siswa kelas 5/8/11, bukan per-siswa grading tapi sekolah
- **Ujian Sekolah**: kenaikan kelas (akhir semester genap), ujian sekolah kelulusan (kelas 6/9/12)

**Implikasi:**
- Gradebook butuh 2 mode: angka (numerik) + kualitatif deskriptor
- Output rapor = PDF dengan format Kemdikbud (sudah standar, ada template)
- AKM-style questions sebagai tipe quiz khusus (literasi/numerasi dengan stem stimulus + multiple questions)
- Ujian sekolah butuh proctoring (sudah ada anti-cheat — tingkatkan)

## 4. Dapodik (Data Pokok Pendidikan)

- Sistem nasional Kemdikbud untuk data sekolah, guru (NIP, NUPTK), siswa (NISN), PTK
- Wajib diisi setiap sekolah; jadi basis DAU/BOS
- Data: identitas, kelas, rombel, mapel, jadwal, sarpras
- Export: CSV atau XML ke aplikasi Dapodik desktop

**Implikasi:**
- Profile siswa: NISN (10 digit), NIK (16 digit), NIS (internal sekolah)
- Profile guru/PTK: NIP, NUPTK, mata pelajaran yang diampu
- Export Dapodik-compatible CSV sebagai fitur admin
- Tidak ada API publik Dapodik (state 2026), jadi **one-way export** dulu; manual upload oleh operator Dapodik

## 5. PPDB (Pendaftaran Peserta Didik Baru)

- Periode Mei–Juli tiap tahun
- Jalur: Zonasi (terbesar), Afirmasi (KIP/miskin), Prestasi (akademik/non-akademik), Perpindahan Tugas Ortu
- Seleksi: berkas + tes (sekolah swasta), berbasis zona (negeri)
- Data: akta lahir, KK, rapor SD/SMP terakhir, prestasi, surat keterangan

**Implikasi:**
- Modul PPDB: period management, jalur selection, kuota per jalur, upload dokumen, tes online (reuse quiz engine), ranking + pengumuman
- Sudah ada tabel `ppdb_periods`, `ppdb_registrations` — butuh flow lengkap
- Integrasi ke enrollment otomatis setelah diterima

## 6. Keuangan sekolah

- **Swasta**: SPP bulanan, uang pangkal (daftar ulang), uang kegiatan, seragam
- **Negeri**: BOS (Bantuan Operasional Sekolah) dari pemerintah — Rp900rb-1.8jt/siswa/tahun (2024), tanpa SPP (tapi ada "sumbangan sukarela")
- **BOSDA** (daerah) untuk sekolah negeri
- Pembayaran: transfer bank, virtual account, Midtrans/Xendit, cash di TU, QRIS
- Pelaporan BOS: rinci per komponen (gaji guru honorer, ATK, kegiatan)

**Implikasi:**
- Modul billing: SPP recurring, invoice, VA generation (integrate payment gateway Indonesia), rekonsiliasi
- Untuk sekolah negeri: tidak tagih SPP, tapi ada modul BOS expense tracking + report generator
- Template laporan BOS sesuai format pemerintah

## 7. Komunikasi orang tua

- **WhatsApp** = de-facto channel utama (99% orang tua punya, SMS/email rendah)
- Grup WA per kelas biasanya dikelola wali kelas manual
- Push notification app: adoption rendah di Android murah (banyak orang tua pakai Android <6)
- Laporan rutin: bulanan, triwulan

**Implikasi:**
- Notifikasi via WhatsApp Business API (sudah ada handler `whatsapp_webhook` di backend — perlu dihubungkan ke BSP seperti Infobip/MessageBird/Twilio WA)
- Broadcast per kelas (pengumuman dari wali kelas)
- Template message harus bahasa Indonesia sopan, format rapor ringkas

## 8. Peran & hierarki

- **Kepala sekolah**: visibility penuh, approve kebijakan, sign rapor
- **Wakasek** (kurikulum, kesiswaan, sarpras, humas): akses bagian
- **Wali kelas**: manage rombel, input sikap siswa, komunikasi ortu kelasnya
- **Guru mapel**: input nilai mapel yang diampu per kelas
- **Guru BK**: catat konseling, issues perilaku
- **TU (Tata Usaha)**: admin siswa, surat menyurat, keuangan
- **Pustakawan**: (kalau perpustakaan digital terintegrasi)
- **Yayasan** (swasta) / **Pengawas** (negeri): audit, monitoring multi-sekolah

**Implikasi:**
- Role system saat ini (teacher/student/admin/parent/principal) **belum cukup**. Butuh: wali kelas (teacher + class assignment), wakasek (admin dengan scope), BK (counselor), TU (admin TU), yayasan (multi-tenant viewer).
- Permission matrix per modul × role, bukan coarse-grained.

## 9. Infrastruktur & konteks teknis

- **Koneksi**: urban cepat, rural lemah (3G, sering putus). Desa/pelosok kadang HP only.
- **Device**: guru sering HP Android mid-range; siswa tergantung umur (SD: HP ortu; SMA: HP sendiri, kadang laptop dipinjamkan)
- **Literasi digital**: bervariasi; UI harus simple, Bahasa Indonesia, hindari jargon
- **Lab komputer sekolah**: kadang ada (SMA IT), sering Chromebook atau desktop lama

**Implikasi:**
- PWA dengan offline mode (cache lessons, draft answer tersimpan, sync saat online)
- Mobile-responsive adalah priority (bukan afterthought)
- UI consistency Bahasa Indonesia (istilah "rapor" bukan "report", "kelas" bukan "class")
- Hindari dependensi browser feature baru; test di Chromium Android 70+

## 10. Regulasi & kepatuhan

- **UU PDP (Perlindungan Data Pribadi) 2022**: consent, data retention, hak hapus, DPO
- Anak di bawah umur: consent ortu, tidak boleh ada marketing/tracking 3rd party
- **Kurikulum sensitif**: konten agama, PKn, sejarah — moderation penting
- **SNI ISO 27001** untuk sekolah besar/yayasan

**Implikasi:**
- Privacy policy + consent flow (ada `/privacy/export-data`, `/privacy/delete-account` — perlu audit lengkap)
- Data retention config per tenant
- Moderation dashboard (sudah ada) harus functional untuk konten UGC (forum, peer review)
- Audit log (sudah ada `audit_logs`) harus complete untuk sensitive actions

## Open questions

- Seberapa jauh harus custom per daerah? (DKI, Jabar, Jatim punya regulasi turunan berbeda)
- Pesantren modern: butuh modul hafalan Quran, kalender Hijriyah — scope in atau out?
- Sekolah inklusi (ABK): fitur khusus (assesmen adaptif, IEP)?
- Integrasi Rapor Pendidikan (platform Kemdikbud) — scope in untuk 2026?
