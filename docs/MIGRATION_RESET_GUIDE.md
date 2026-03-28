# Database Migration Reset Guide

> ⚠️ **Dokumen ini sudah outdated.** Panduan setup database yang aktual ada di:
> **[`docs/SETUP_GUIDE.md`](./SETUP_GUIDE.md)**

---

## Perubahan Arsitektur

Dokumen ini ditulis saat EduSync masih memiliki 157 migrasi individual (001–825).

Sejak Phase 1 (2026-03-21), semua migrasi telah di-squash menjadi satu file baseline:

- **Sebelumnya**: 157+ file migrasi individual
- **Sekarang**: `supabase/migrations/000_baseline.sql` (satu file, 84 tabel, 194 RLS policy, 213 function)
- File lama diarsipkan di `supabase/migrations/_archive/`

## Cara Setup Database (Saat Ini)

Ikuti **[`docs/SETUP_GUIDE.md`](./SETUP_GUIDE.md)** — Langkah 3 hingga Langkah 7.

Perintah utama:
