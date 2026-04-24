# SMA Nusantara Dev — Persona Credentials

Synthetic dev tenant seeded by `edusync-api/schema/dev_seed.sql` and reset via `edusync-api/scripts/reset-dev-school.sh`. **All accounts use password `password123`.** Hashes are bcrypt (`$2a$`) emitted by pgcrypto's `crypt(..., gen_salt('bf'))`; the auth layer accepts both bcrypt and Argon2 and silently rehashes to Argon2 on first successful login (see `edusync-api/crates/auth/src/password.rs:39`).

Tenant slug: `sma-nusantara-dev`. Tenant UUID is deterministic — derived from the seed namespace `a3e5b8c1-2f4d-4d9a-8e7c-1b2d3e4f5a60` via `uuid_generate_v5()`. Reseeds preserve all UUIDs.

## Staff (16 accounts)

| Email | Nama | `tenant_memberships.role` | `user_roles.role` (enum) |
|---|---|---|---|
| `admin@nusantara.dev` | Admin Sekolah | `admin` | `ADMIN` |
| `kepsek@nusantara.dev` | Bapak Drs. Hartono Wijaya | `principal` | `PRINCIPAL` |
| `wakasek.kurikulum@nusantara.dev` | Ibu Sri Mulyati | `wakasek_kurikulum` | `ADMIN` |
| `wakasek.kesiswaan@nusantara.dev` | Bapak Agus Setiawan | `wakasek_kesiswaan` | `ADMIN` |
| `tu@nusantara.dev` | Ibu Dewi Lestari | `tu` | `ADMIN` |
| `bk@nusantara.dev` | Ibu Rina Pratiwi | `guru_bk` | `TEACHER` |
| `wali.x-ipa-1@nusantara.dev` | Bapak Budi Santoso | `wali_kelas` | `TEACHER` |
| `wali.x-ipa-2@nusantara.dev` | Ibu Siti Aminah | `wali_kelas` | `TEACHER` |
| `wali.x-ips-1@nusantara.dev` | Bapak Joko Susilo | `wali_kelas` | `TEACHER` |
| `wali.xi-ipa-1@nusantara.dev` | Ibu Maya Anggraini | `wali_kelas` | `TEACHER` |
| `guru.matematika@nusantara.dev` | Bapak Eko Prasetyo | `teacher` | `TEACHER` |
| `guru.bahasa-indonesia@nusantara.dev` | Ibu Nina Hartati | `teacher` | `TEACHER` |
| `guru.bahasa-inggris@nusantara.dev` | Mr. David Pratama | `teacher` | `TEACHER` |
| `guru.fisika@nusantara.dev` | Bapak Dimas Saputra | `teacher` | `TEACHER` |
| `guru.biologi@nusantara.dev` | Ibu Lia Wulandari | `teacher` | `TEACHER` |
| `guru.pkn@nusantara.dev` | Bapak Hadi Nugroho | `teacher` | `TEACHER` |

## Students (120 accounts)

Pattern: `siswaNNN@nusantara.dev` for `NNN ∈ {001, 002, ..., 120}`.

Distribution across rombel (4 classes):

| Rombel | Wali kelas | Range | Count |
|---|---|---|---|
| X IPA 1 | Bapak Budi Santoso | siswa001 — siswa030 | 30 |
| X IPA 2 | Ibu Siti Aminah | siswa031 — siswa058 | 28 |
| X IPS 1 | Bapak Joko Susilo | siswa059 — siswa084 | 26 |
| XI IPA 1 | Ibu Maya Anggraini | siswa085 — siswa114 | 30 |
| (unenrolled) | — | siswa115 — siswa120 | 6 |

Six unenrolled students are intentional — for testing edge cases (no rombel, no schedule visible).

Names are synthesized: `first_name` cycles through `{Ahmad, Siti, Budi, Rina, Agus, Dewi, Eko, Maya, Hadi, Nina}`, `last_name` cycles through `{Santoso, Wijaya, Pratiwi, Saputra, Hartono, Lestari, Setiawan, Anggraini, Pratama, Wulandari}`. NISN field is populated in `users.raw_user_meta_data->>'nisn'` (10-digit synthetic).

## Parents (120 accounts)

Pattern: `ortuNNN@nusantara.dev` for `NNN ∈ {001, 002, ..., 120}`. 1:1 mapping to students by suffix (`ortu001` ↔ `siswa001`).

Note: the parent ↔ student linking table is not yet seeded here — it lands in **Fase 4 / Prio 6** when the parent portal Midtrans flow comes online. Until then, the parent persona logs in but sees no children. This is acceptable for sweep persona coverage (`parent_specific_child` test in Prio 2 Unit 10 will gain real data once Fase 4 lands).

## Sample data already seeded

- 4 courses (Matematika Wajib X, Bahasa Indonesia X, Fisika X IPA, Pendidikan Pancasila X)
- `course_classes` joins all 4 courses to all 4 rombel
- 3 announcements (welcome, P5 launch, SPP reminder)

## Sample data NOT seeded yet (deferred per dev_seed.sql TODO)

| Entity | Deferred to |
|---|---|
| Lessons + assignments + quizzes per course | Fase 2 (CP/ATP tagging) |
| Attendance records (2 weeks × 4 rombel) | Fase 1 (timetable lands first) |
| Invoices SPP 3 bulan (60% paid) | Fase 4 (Midtrans + finance) |
| Forum posts + discussions | Fase 2 (event bus) |
| P5 project rows | Fase 2 (P5 module) |
| `student_dossier` (NISN, NIK, alamat, wali) | Fase 1 (dossier table) |
| `staff_dossier` (NIP, NUPTK) | Fase 1 (dossier table) |

## Reset workflow

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres \
  ./edusync-api/scripts/reset-dev-school.sh
```

Should complete in <30s. The script first calls `dev_seed_purge()` to drop all SMA Nusantara Dev rows in FK-safe order, then re-applies `dev_seed.sql`.

## Security note

These credentials are **dev-only**. The tenant slug `sma-nusantara-dev` and the `*.nusantara.dev` email pattern are reserved for synthetic use; production must never seed accounts with `is_demo = true` or with these emails. The seed script tags every profile with `is_demo = true` so reporting/billing can filter them out.
