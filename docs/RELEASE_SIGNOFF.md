# Release Signoff Checklist

## Engineering

- `pnpm typecheck` lulus
- `pnpm build` lulus
- lint terarah scope kritikal lulus
- migrasi baru tervalidasi
- rollback plan terdokumentasi

## Product

- Tidak ada blocker `P0`
- Flow auth, parent, principal, finance, bulk import, dan AI Tutor terverifikasi
- Copy UI baru tetap Bahasa Indonesia

## Data & Security

- Semua RPC analytics menerima `p_tenant_id`
- Tidak ada `SELECT *` baru pada query produksi
- Auth guard dan role guard aktif pada RPC/Edge Function baru
- Audit log aktif untuk aksi admin finance

## Ops

- Health check produksi lulus
- Alert threshold SLO aktif
- Incident commander dan rollback owner ditunjuk
- DR checklist terakhir sudah ditinjau
