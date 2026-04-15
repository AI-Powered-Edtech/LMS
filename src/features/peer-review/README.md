# Peer Review Module

Modul sistem penilaian sejawat (peer assessment) untuk EduSync LMS.

## Gambaran Umum

Fitur ini memungkinkan guru mengaktifkan peer review untuk tugas tertentu, di mana siswa saling
menilai hasil kerja satu sama lain secara anonim (opsional). Penilaian peer review dapat
dikonfigurasi dengan bobot tertentu terhadap nilai akhir.

## Struktur

```
src/features/peer-review/
├── api/
│   └── peerReviewService.ts    ← API calls (CRUD, RPC)
├── queries/
│   ├── peerReviewKeys.ts       ← React Query key factory
│   └── peerReviewQueries.ts    ← useQuery / useMutation hooks
├── components/
│   ├── PeerReviewConfigPanel.tsx  ← UI konfigurasi peer review (guru)
│   ├── PeerReviewList.tsx         ← Daftar review yang ditugaskan (siswa)
│   ├── PeerReviewForm.tsx         ← Form pengisian review (siswa)
│   └── PeerReviewSummary.tsx      ← Ringkasan review per tugas (guru)
├── types/
│   └── index.ts                ← TypeScript interfaces
├── index.ts                    ← Barrel exports
└── README.md
```

## Database Tables

- `peer_review_config` — Konfigurasi per assignment (1:1 dengan assignments)
- `peer_reviews` — Review individual (reviewer → submission)

## Alur Penggunaan

### Guru

1. Buka modal "Buat Tugas" → tab "Peer Review"
2. Aktifkan toggle "Aktifkan Peer Review"
3. Atur jumlah review, bobot nilai, anonimitas, dan tenggat waktu
4. Klik "Simpan Konfigurasi"
5. Setelah siswa mengumpulkan tugas, klik "Mulai Penugasan Review"
6. Pantau progress di panel TeacherSubmissionsPanel

### Siswa

1. Navigasi ke "/app/student/peer-reviews" atau lihat di panel tugas
2. Klik review yang ditugaskan
3. Baca konten tugas (read-only)
4. Isi nilai (0-100) dan komentar (min. 50 karakter)
5. Klik "Kirim Review"

## Keamanan

- RLS: Siswa hanya melihat review milik mereka sebagai reviewer
- Guru dan admin melihat semua review dalam tenant
- `assign_peer_reviews` RPC: SECURITY DEFINER, auth check, tenant scoping
- Anonymity: reviewer_id tidak ditampilkan ke penerima jika `is_anonymous = true`

## Phase

Phase 33B — Peer Assessment/Review System
