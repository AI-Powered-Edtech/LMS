# SLO EduSync LMS

## Tujuan

Dokumen ini menetapkan target operasional minimum untuk jalur kritikal EduSync setelah hardening Gold readiness 2026-04-07.

## SLI dan SLO

| Layanan             | SLI                                        | Target                                  |
| ------------------- | ------------------------------------------ | --------------------------------------- |
| Login               | p95 waktu respons submit login             | < 2 detik                               |
| Parent Dashboard    | p95 refresh snapshot                       | < 3 detik                               |
| Principal Dashboard | p95 overview + monthly trend               | < 3 detik                               |
| Finance Dashboard   | p95 halaman invoice + overview             | < 3 detik                               |
| Bulk Import         | waktu sampai baris pertama diproses        | < 1 menit                               |
| Bulk Import         | waktu selesai 10.000 baris                 | < 15 menit                              |
| AI Tutor            | availability respons non-5xx               | >= 99%                                  |
| AI Tutor            | fallback deterministic saat provider gagal | 100% request yang lolos auth/rate limit |

## Alert Threshold

- Login error rate > 5% selama 10 menit
- Parent dashboard p95 > 4 detik selama 15 menit
- Principal dashboard p95 > 4 detik selama 15 menit
- Finance dashboard p95 > 4 detik selama 15 menit
- Bulk import jobs `processing` lebih dari 30 menit
- AI Tutor 5xx rate > 2% selama 10 menit
- Health check produksi non-200 selama 3 percobaan berturut-turut

## Catatan Implementasi

- Parent dashboard harus memakai `get_parent_dashboard_snapshot()` sebagai jalur default.
- Principal dashboard harus memakai `get_principal_overview_cached()` dan `get_principal_monthly_trend_cached()`.
- Survey analytics tidak boleh lagi diagregasi di browser.
- Finance invoice listing harus memakai `get_finance_dashboard_page()`.
- Bulk import dipantau dari `bulk_import_jobs` dan `bulk_import_job_rows`.
