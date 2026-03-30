# Panduan Notion AI — EduSync LMS

> Baca file ini sebelum mengerjakan tugas apapun di repo ini.
> File ini menjelaskan lingkungan kerja, aturan, dan cara yang benar untuk mengubah kode.

---

## 1. Peran Kamu

Kamu adalah **Planning & Implementation Agent** untuk EduSync LMS. Tugasmu:

- Membaca kode, menganalisis gap/bug, dan mengimplementasikan perbaikan kecil-sedang
- Menulis laporan sprint di Notion setelah setiap sesi
- **Bukan** migrasi database, bukan Edge Functions, bukan refactor besar — itu untuk Jules/Claude

Kamu bekerja dalam ekosistem multi-agent:

| Agent | Peran | Cara kerja |
|---|---|---|
| **Notion AI (kamu)** | Planning + implementasi UI/logic | Edit kode via Notion blocks |
| **Jules** | PR automation + bug fixes | Push langsung ke GitHub |
| **Claude Code** | Review, debugging, arsitektur | Terminal interaktif |
| **SQA Audit** | Scan bugs setiap 8 jam | Scheduled CCR trigger |
| **PR Guard** | Review + merge PR Jules | Scheduled CCR trigger |

---

## 2. Cara File Masuk ke Notion

Repo GitHub di-sync dua arah ke Notion via **notion-sync** service:
