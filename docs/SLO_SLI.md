# Service Level Objectives (SLO) & Service Level Indicators (SLI)

Dokumen ini mendefinisikan Service Level Objectives (SLO), Service Level Indicators (SLI), dan strategi routing peringatan (alerting routing) untuk platform EduSync guna memastikan keandalan sistem dan ketersediaan layanan.

## 1. Definisi SLI dan SLO

### 1.1 Frontend (Vercel)

- **SLI**: Persentase HTTP requests yang mengembalikan status kode `2xx` atau `3xx` (Availability).
- **SLO**: 99.9% uptime per bulan.
- **SLI**: Persentase HTTP requests yang diselesaikan dalam waktu kurang dari 500ms (Latency).
- **SLO**: 95% requests < 500ms.

### 1.2 Backend & Database (Supabase)

- **SLI**: Persentase query database yang berhasil tanpa error 5xx (Availability).
- **SLO**: 99.9% ketersediaan query per bulan.
- **SLI**: Waktu respons eksekusi query RPC (Latency).
- **SLO**: 99% query RPC diselesaikan < 300ms.

### 1.3 Autentikasi (Supabase Auth)

- **SLI**: Tingkat keberhasilan login pengguna (Authentication Success Rate).
- **SLO**: 99.9% percobaan login berhasil dalam kondisi sistem normal.

## 2. Alerting Routing (Sentry & Log Monitoring)

Sistem alerting dirancang untuk secara otomatis mengidentifikasi degradasi layanan dan memberi tahu tim yang tepat melalui channel yang sesuai.

### 2.1 Tingkat Keparahan Peringatan (Alert Severity)

| Severity          | Kondisi / Trigger                                                      | Channel Notifikasi                    | Respons Target (SLA) |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------- | -------------------- |
| **P0 (Critical)** | Sistem down, Auth gagal > 5%, atau kegagalan Health Check post-deploy. | PagerDuty, Slack (`#alerts-critical`) | < 15 Menit           |
| **P1 (High)**     | Latency tinggi (P99 > 2s), peningkatan error rate > 2%.                | Slack (`#alerts-high`)                | < 1 Jam              |
| **P2 (Medium)**   | Peringatan kapasitas storage, background job lambat.                   | Slack (`#alerts-warnings`), Email     | < 24 Jam             |
| **P3 (Low)**      | UI bugs non-kritis, laporan error individu yang jarang terjadi.        | Jira / Linear (Auto-ticket)           | Sesuai Sprint        |

### 2.2 Routing Sentry

- **Frontend Errors**: Routing ke tim Frontend. Alert dikirim jika terjadi spike error tak terduga (>10 error sama dalam 5 menit).
- **Network/API Errors**: Routing ke tim Backend/SRE. Alert jika API gagal merespons atau mengembalikan 5xx error berturut-turut.

### 2.3 Supabase Monitoring

- **Database CPU/Memory Usage**: Alert di trigger jika CPU/Memory > 80% selama 10 menit.
- **Connection Pooling**: Alert jika koneksi aktif mencapai > 90% batas maksimum.

## 3. Eskalasi dan Tindak Lanjut

Jika sebuah P0/P1 alert terpicu:

1. SRE / On-call Engineer segera memeriksa dashboard metrik dan logs (Sentry/Supabase Logs).
2. Jika penyebabnya adalah deployment baru, lakukan **Auto-rollback** (seperti yang telah dikonfigurasi di GitHub Actions) atau rollback manual.
3. Setelah insiden teratasi, tim wajib membuat dokumen **Post-Mortem** yang berisi _Root Cause Analysis_ (RCA) dan langkah pencegahan.
