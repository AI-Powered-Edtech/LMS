# Gold Readiness Implementation — 2026-04-07

## Scope yang Diimplementasikan

- Survey analytics dipindahkan ke RPC tenant-scoped:
  - `get_survey_results(p_tenant_id, p_survey_id)`
  - `export_survey_responses(p_tenant_id, p_survey_id)`
  - `get_survey_summary(p_tenant_id)`
- Finance backend dipertegas:
  - `get_finance_dashboard_page(...)`
  - `reconcile_invoice_payment(...)`
  - `send_invoice_reminders(...)`
- Parent dashboard memakai snapshot tunggal:
  - `get_parent_dashboard_snapshot(...)`
- Principal trend bulanan dipindahkan ke server:
  - `get_principal_monthly_trend_cached(...)`
- Bulk import asynchronous:
  - `bulk_import_job_rows`
  - `process_bulk_import_jobs(...)`
  - worker cron `process-bulk-import-jobs`
- AI Tutor:
  - rate limit memakai `check_ai_tutor_rate_limit(...)`
  - fallback deterministic saat kedua model Groq gagal
- Offline banner memakai status sinkronisasi terpusat dari `backgroundSync` yang memanggil `offlineQueue`

## Catatan Risiko Tersisa

- Workflow deploy production masih belum diganti penuh ke model canary/promote/rollback alias otomatis.
- `lint:critical` formal di CI belum ditambahkan sebagai gate terpisah.
- Dokumen schema pusat sedang direstrukturisasi di worktree, sehingga perubahan schema baru dicatat di laporan ini dan migration SQL.
