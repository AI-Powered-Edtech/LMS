# Environment Variables

Dokumen ini mendokumentasikan seluruh environment variable yang digunakan oleh EduSync LMS (frontend + backend).

> ⚠️ **Jangan commit file `.env` ke git.** Gunakan `.env.example` sebagai template dan isi nilainya di environment lokal / CI secrets.

## Quick start

```bash
cp .env.example .env
# Edit .env sesuai environment Anda
```

---

## Frontend (Vite) — `.env`

Variabel dengan prefix `VITE_` di-embed ke bundle frontend saat build. **Jangan taruh secret sensitif di sini.**

### Backend API (wajib)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| VITE_API_BACKEND | ✅ | `vil` | Identitas backend provider. Saat ini hanya `vil` yang didukung (sejak Phase 6). |
| VITE_API_URL | ✅ | `http://localhost:8080` | Base URL REST API backend VIL. Ganti ke URL staging/production saat deploy. |
| VITE_WS_URL | ✅ | `ws://localhost:8080/ws` | WebSocket endpoint untuk realtime (gradebook, notifications, dsb). |

### Error monitoring (opsional — Sentry)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| VITE_SENTRY_DSN | ⬜ | *(empty)* | Sentry DSN client. Kosongkan untuk disable Sentry. Ambil dari *Sentry → Settings → Client Keys*. |
| VITE_SENTRY_ORG | ⬜ | `edusync` | Organization slug untuk upload sourcemap saat build. |
| VITE_SENTRY_PROJECT | ⬜ | `edusync-lms` | Project slug untuk upload sourcemap saat build. |
| VITE_SENTRY_AUTH_TOKEN | ⬜ | *(empty)* | Auth token untuk upload sourcemap. **Set di CI env, bukan di `.env` client.** Ambil dari *Sentry → Settings → Auth Tokens*. |

### Push notifications (opsional — Web Push API)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| VITE_VAPID_PUBLIC_KEY | ⬜ | *(empty)* | VAPID public key untuk Web Push Notifications. Generate via `npx web-push generate-vapid-keys`. |

### Developer helpers (hanya lokal)

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| VITE_DEV_PASSWORD | ⬜ | *(empty)* | Pre-fill password untuk Quick Login buttons di halaman login. **Hanya aktif di dev.** |
| VITE_USE_ROMBEL_ADAPTER | ⬜ | `true` | Flag-gated config for rombel-to-class backward compatibility |

---

## Backend (EduSync API / VIL) — server env

Secret di bawah ini di-set via environment server atau secret manager (bukan di `.env` frontend). Didokumentasikan di sini sebagai referensi tim.

| Variable | Required | Description |
| --- | --- | --- |
| GROQ_API_KEY | ✅ | API key Groq untuk AI Tutor & AI Grading. Dapatkan di <https://console.groq.com>. |
| DATABASE_URL | ✅ | PostgreSQL connection string untuk VIL backend (format: `postgres://user:pass@host:5432/db`). |
| JWT_SECRET | ✅ | Secret untuk sign JWT access token. Minimum 32 karakter acak. |
| JWT_REFRESH_SECRET | ✅ | Secret untuk sign JWT refresh token. Minimum 32 karakter acak, **berbeda** dari `JWT_SECRET`. |

Lihat juga [`docs/SECRETS.md`](./SECRETS.md) untuk rotation policy dan tata kelola secret, dan [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) untuk cara men-set env di staging/production.

---

## CI/CD secrets (GitHub Actions)

Selain variabel di atas, workflow CI membutuhkan GitHub Secrets berikut:

| Secret | Required | Digunakan oleh |
| --- | --- | --- |
| LHCI_GITHUB_APP_TOKEN | ⬜ | `release-gate.yml` → Lighthouse CI (untuk comment status PR). |
| CHROMATIC_PROJECT_TOKEN | ⬜ | `chromatic.yml` → Visual regression. |

Untuk job E2E/Performance di `release-gate`, `VITE_API_URL` hanya diwajibkan saat workflow berjalan di deployment ke staging/production — bukan saat pull request.

---

## Validasi

Konsistensi antara `.env.example` dan dokumen ini dijaga oleh `scripts/validate-docs.sh` (dipanggil oleh workflow `Validate Documentation`). Jika Anda menambah/menghapus variabel di `.env.example`, perbarui daftar di bawah **dan** tabel di atas agar CI tidak gagal.

---

## CI validator index

<!--
  Daftar di bawah ini di-parse oleh scripts/validate-docs.sh.
  Format wajib: `- env | NAMA_VAR | catatan` (tidak boleh diawali karakter `|`).
  Jaga sinkronisasi dengan .env.example — CI akan gagal bila ada variabel yang hilang.
-->

- env | VITE_API_BACKEND | documented above
- env | VITE_API_URL | documented above
- env | VITE_WS_URL | documented above
- env | VITE_SENTRY_DSN | documented above
- env | VITE_SENTRY_ORG | documented above
- env | VITE_SENTRY_PROJECT | documented above
- env | VITE_SENTRY_AUTH_TOKEN | documented above
- env | VITE_VAPID_PUBLIC_KEY | documented above
- env | VITE_DEV_PASSWORD | documented above
- env | VITE_USE_ROMBEL_ADAPTER | documented above
