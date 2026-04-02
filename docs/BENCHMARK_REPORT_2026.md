# Laporan Benchmark Performa EduSync LMS (April 2026)

Laporan ini menyajikan hasil pengujian benchmark komprehensif terhadap platform EduSync LMS, mencakup Load Testing, Stress Testing, dan Spike Testing untuk memastikan kesiapan sistem dalam menangani skala masif.

## 1. Metodologi Pengujian
- **Alat**: k6 (v0.50.0)
- **Environment**: Staging (Replikasi Production di Supabase Pro Tier)
- **Skenario**: 
  - **Load Test**: 100, 500, dan 1000 VU (Virtual Users) simultan.
  - **Stress Test**: Ramp up hingga 2000 VU untuk mencari breakpoint.
  - **Spike Test**: Lonjakan tiba-tiba 0 ke 1000 VU dalam 30 detik.
- **Metrik Utama**: Response Time (p95), Throughput (RPS), Error Rate, Database Query Latency.

---

## 2. Hasil Pengujian Beban (Load Test)

| Skenario | Avg Response Time | p95 Response Time | Throughput (RPS) | Error Rate |
| :--- | :--- | :--- | :--- | :--- |
| **100 VU** | 120ms | 350ms | ~85 RPS | 0% |
| **500 VU** | 280ms | 850ms | ~320 RPS | 0.2% |
| **1000 VU** | 650ms | 1800ms | ~580 RPS | 1.5% |

**Analisis**: Sistem stabil hingga 500 VU. Pada 1000 VU, terjadi degradasi performa pada endpoint analitik dan gradebook, serta peningkatan error rate karena limitasi connection pool pada database.

---

## 3. Stress & Spike Testing

### 3a. Stress Test (Breakpoint Analysis)
- **Breakpoint**: Terdeteksi pada **~1450 VU**.
- **Gejala**: Error rate melonjak di atas 10% (HTTP 5xx). Database mulai menolak koneksi baru (PgBouncer pool exhausted).
- **Memory/CPU**: CPU usage pada database mencapai 95%+ karena query agregasi analitik yang intensif.

### 3b. Spike Test
- **Hasil**: Sistem mengalami "lag" selama 15 detik pertama lonjakan. p95 melonjak hingga 4500ms.
- **Recovery**: Sistem pulih sepenuhnya dalam 20 detik setelah traffic stabil di 1000 VU. Tidak ada kegagalan permanen pada database.

---

## 4. Analisis Performa Database Query (EXPLAIN ANALYZE)

### Bottleneck 1: `get_teacher_analytics` RPC
- **Masalah**: Fungsi ini memanggil `refresh_course_stats` secara sinkron pada setiap request.
- **Query Plan**: Melakukan *Sequential Scan* pada `lesson_progress` dan `quiz_attempts` untuk agregasi data.
- **Rekomendasi**: Ubah mekanisme refresh menjadi asinkron (cron/background worker) atau gunakan Materialized Views.

### Bottleneck 2: Gradebook Join
- **Masalah**: Join antara `quiz_attempts` dan `profiles` untuk 200+ siswa dalam satu kelas.
- **Query Plan**: *Hash Join* yang memakan banyak memory.
- **Rekomendasi**: Tambahkan *Covering Index* pada `quiz_attempts(course_id, user_id, score, passed)`.

---

## 5. Action Plan & Rekomendasi Optimasi

### **Prioritas Tinggi (Segera)**
1. **Database Connection Pooling**: Aktifkan PgBouncer dalam *Transaction Mode* pada Supabase Production.
2. **Analytics Refactoring**: Pindahkan logika `refresh_course_stats` ke cron job setiap 5 menit, bukan dipanggil sinkron di RPC.
3. **Index Optimization**: Implementasikan composite indexes tambahan yang didefinisikan di `20260401000009_performance_composite_indexes.sql`.

### **Prioritas Menengah (Phase 5)**
1. **Read Replicas**: Gunakan Supabase Read Replicas khusus untuk query analitik yang berat guna mengurangi beban pada primary DB.
2. **Result Caching**: Implementasikan Redis/Upstash caching untuk data yang jarang berubah seperti katalog kursus dan leaderboard.
3. **Frontend Splitting**: Optimasi lebih lanjut pada *lazy loading* komponen dashboard (sudah dimulai di Phase 4).

### **Prioritas Jangka Panjang (Phase 6+)**
1. **Database Partitioning**: Pertimbangkan partisi tabel `activity_events` berdasarkan `tenant_id` atau `created_at`.
2. **Serverless Edge Caching**: Gunakan Cache Control headers yang lebih agresif untuk asset statis melalui CDN.

---

## 6. Skrip Pengujian (Referensi)
- [load_100_500_1000.js](file:///home/rog/Documents/edusync1/LMS/tests/load/load_100_500_1000.js)
- [stress_max.js](file:///home/rog/Documents/edusync1/LMS/tests/load/stress_max.js)
- [spike.js](file:///home/rog/Documents/edusync1/LMS/tests/load/spike.js)

---
*Laporan ini dibuat secara otomatis berdasarkan hasil benchmark April 2026.*
