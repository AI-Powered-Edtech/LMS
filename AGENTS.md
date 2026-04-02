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
| **Status**          | Production-ready — Phase 30 selesai (2026-04-02)                               |
| **Roles**           | `'student' \| 'teacher' \| 'admin' \| 'parent' \| 'principal'`                 |

---

### Fitur Baru (Phase 26–30)

| Phase | Fitur                                                                                           | Status       |
| ----- | ----------------------------------------------------------------------------------------------- | ------------ |
| 26    | Student UX: Quiz Timer Pause, File Preview, Offline Mode, Deep Link Enrollment                  | ✅ COMPLETED |
| 27    | Teacher UX: Onboarding Wizard, SpeedGrader Annotations, CSV Export, Activity Feed               | ✅ COMPLETED |
| 28    | Admin UX: Bulk User Import, Audit Export, Feature Management, Finance Dashboard                 | ✅ COMPLETED |
| 29    | Parent Portal: OTP Registration, Mobile Dashboard, WhatsApp Digest, Messaging, Monthly Reports  | ✅ COMPLETED |
| 30    | Principal Dashboard: Executive Metrics, Before-After Analytics, Report Generator, Survey System | ✅ COMPLETED |

---

## Critical Rules

### ❌ Jangan Lakukan
