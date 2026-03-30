# EduSync LMS — Agent Configuration

> Quick reference untuk AI coding agents. Baca `CLAUDE.md` untuk instruksi lengkap.
> Baca `docs/DX.md` untuk peta dokumentasi lengkap.

---

## Project Identity

| Aspek               | Detail                                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| **Tipe**            | Multi-tenant SaaS LMS untuk sekolah Indonesia                                  |
| **Stack**           | React 19, Vite 6, TypeScript 5.8, Tailwind CSS v4, Supabase JS v2              |
| **Backend**         | Supabase-only — tidak ada Express/NestJS. Logic di PostgreSQL + Edge Functions |
| **Package manager** | **pnpm** (bukan npm atau yarn)                                                 |
| **UI language**     | **Bahasa Indonesia** — semua teks user-visible                                 |
| **Routing**         | Hash routing — semua URL pakai `/#/` prefix                                    |
| **Status**          | Production-ready — Phase 21 selesai (2026-03-25)                               |

---

## Critical Rules

### ❌ Jangan Lakukan
