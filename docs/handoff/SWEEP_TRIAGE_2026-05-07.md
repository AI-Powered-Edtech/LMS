# Sweep Triage — 2026-05-07

Dari verification gate Wave 1+2+3 (HANDOFF_2026-04-25.md), `sweep.spec.ts` 9-persona menghasilkan total 82 issue:

| Persona | Issue count | Sumber file (jika ada) |
|---|---|---|
| admin | 40 | `.qa-sweep/admin/` |
| teacher | 24 | `.qa-sweep/teacher/` |
| student | 18 | `.qa-sweep/student/` |
| wali_kelas | 0 | — |
| wakasek_kurikulum | 0 | — |
| principal | 0 | — |
| guru_bk | 0 | — |
| tu | 0 | — |
| parent | 0 | — |

## Triage protocol

Setiap issue di `.qa-sweep/<persona>/issues.json` dijadikan satu baris di sini, dikelompokkan by root cause, lalu diangkat jadi GH issue terpisah saat fix work dimulai.

Kategori root cause yang umum (dari pengalaman wave-wave sebelumnya):

1. **Console error: 4xx/5xx response** — biasanya FE memanggil endpoint yang belum allowlist/RPC belum ada. Fix: tambahkan ke `data_plane.rs::ALLOWED_TABLES`/`ALLOWED_RPCS` atau patch FE call site.
2. **Console warning: React key dup / unstable ref** — list rendering tanpa unique key, atau useQuery default `[]` re-allocates per render.
3. **Network 401/403 (silent)** — RBAC policy gap; `unexpected_deny` di `rbac.spec.ts` matrix harus 0, tapi sweep meng-check ulang.
4. **Empty state crash / undefined access** — data shape tidak guarded.

## Action item

- [ ] Operator: jalankan ulang `pnpm test:e2e tests/e2e/sweep.spec.ts -- --reporter=json --output=.qa-sweep/` untuk regenerate raw issue files
- [ ] Klasifikasi 82 issue ke 4 kategori di atas
- [ ] Buat 1 GH issue per kategori (bukan per-baris) supaya tractable
- [ ] Prioritas: admin (40) → teacher (24) → student (18)

## Definition of done untuk batch ini

Sweep regression CI hijau untuk semua 9 persona dengan `issue_count <= baseline + 5%` (hindari flicker).
