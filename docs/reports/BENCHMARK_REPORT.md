# EduSync LMS - Laporan Benchmark Performa & Action Plan Optimasi

## 1. Laporan Pengujian Beban (Load, Stress, Spike)

Pengujian dilakukan menggunakan k6 untuk simulasi traffic pengguna secara simultan terhadap arsitektur Supabase-only.

### 1.1 Baseline Performance (Load Testing 100 VU)

Pengujian beban standar (100 VU) menghasilkan metrik dasar:

- **Response Time (p95):**
  - `auth`: ~350ms
  - `quiz`: ~420ms
  - `dashboard`: ~850ms
  - `gradebook`: ~1100ms
  - `analytics`: ~2300ms
- **Throughput:** ~450 req/sec
- **Error Rate:** 0.02%
- **Database CPU Utilization:** 15% - 25%
- **Memory Usage (PostgreSQL):** 40% dari alokasi

### 1.2 Bottleneck Identification (Stress & Spike Testing)

Pengujian batas maksimal (hingga 2000 VU) dan lonjakan traffic mendadak (0 ke 1000 VU dalam 30 detik) mengidentifikasi beberapa _bottleneck_ kritis:

1. **Database Query Performance (Analytics RPC):**
   Fungsi RPC `get_teacher_analytics` menyebabkan _CPU spike_ hingga 98% saat 500+ guru mengakses dashboard secara bersamaan. Query aggregasi besar lambat tanpa optimasi.
2. **Missing Indexes (Dashboard & Gradebook):**
   Tabel `courses` (filter `status`), `quiz_questions`, dan `quiz_attempts` (sort by `completed_at`) tidak memiliki indeks yang memadai, menyebabkan _Sequential Scans_ saat traffic tinggi.
3. **Frontend Rendering & Asset Loading (Lighthouse):**
   - **LCP (Largest Contentful Paint):** 3.2s (Suboptimal)
   - _Bundle size_ awal terlalu besar karena komponen berat (Chart, Rich Text Editor) dimuat saat inisialisasi aplikasi.
   - _Data fetching_ berulang kali ke Supabase (tidak optimalnya `staleTime` React Query).
4. **Connection Exhaustion:**
   Saat Spike Test (1000 VU), PostgreSQL Connection Pool (PgBouncer) mencapai limit, menyebabkan _Error Rate_ naik menjadi 12% (timeout).

---

## 2. Action Plan Optimasi

Berdasarkan analisis _bottleneck_, berikut adalah _Action Plan_ yang akan diimplementasikan:

### Fase 1: Optimasi Database (Supabase / PostgreSQL)

- [x] **Add B-Tree & GIN Indexes:** Menambahkan indeks pada kolom yang sering di-filter dan di-sortir (`courses.status`, `quiz_attempts.completed_at`, `quiz_questions.course_id`).
- [x] **Materialized Views untuk Analytics:** Mengganti _real-time aggregation_ pada `get_teacher_analytics` dengan _Materialized View_ yang di-refresh secara periodik (atau menggunakan _trigger-based incremental updates_).

### Fase 2: Optimasi Frontend (React 19 + Vite)

- [x] **React Query Caching:** Menyesuaikan `staleTime` dan `gcTime` di konfigurasi global `@tanstack/react-query` untuk meminimalkan pemanggilan API yang tidak perlu (terutama untuk data referensi yang jarang berubah).
- [x] **Route-Level Code Splitting:** Menggunakan `React.lazy` atau fitur lazy loading dari React Router v7 untuk komponen _heavy_ (Analytics, Dashboard Charts, Settings).
- [x] **Vite Build Optimization:** Mengkonfigurasi _manual chunks_ di `vite.config.ts` untuk memisahkan _vendor libraries_ (seperti `recharts`, `lucide-react`) dari _app code_.

### Fase 3: Konfigurasi Infrastruktur (Supabase Dashboard)

_(Langkah manual yang perlu dilakukan di Dashboard Supabase)_

- Aktifkan **Connection Pooler (Supavisor)** dengan mode `Transaction`.
- Update environment variable `.env` aplikasi untuk menggunakan port `6543` (Pooler URL) bukan `5432` (Direct URL).
- Atur **Edge Cache** (CDN) untuk aset publik dan API GET endpoints jika memungkinkan.

---

_Dokumen ini merupakan panduan implementasi berkelanjutan untuk memastikan aplikasi siap menangani skala Production._
