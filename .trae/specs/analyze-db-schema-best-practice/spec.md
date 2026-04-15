# Analisa Skema Database Spec

## Why
Mengevaluasi skema database sangat penting untuk memastikan bahwa desain struktur data yang ada sudah skalabel, memiliki performa yang baik, dan mudah dipelihara. Analisis ini membantu mengidentifikasi potensi masalah seperti kurangnya indeks, normalisasi yang buruk, ketidakkonsistenan penamaan, atau tidak adanya batasan kunci asing (foreign key constraints) yang dapat mempengaruhi integritas data dan performa aplikasi di lingkungan produksi.

## What Changes
- Melakukan pencarian dan peninjauan (*review*) terhadap file skema database (misalnya `schema_baseline.sql`, file migrasi, dll).
- Menganalisis struktur tabel, relasi, tipe data, penggunaan indeks, dan penerapan praktik terbaik (*best practices*) seperti normalisasi.
- Membuat laporan komprehensif yang berisi temuan-temuan dari analisis skema database serta rekomendasi perbaikan.

## Impact
- Affected specs: Dokumentasi Arsitektur Database.
- Affected code: 
  - File skema database (misal: `schema_baseline.sql`, direktori migrasi).
  - Laporan baru: `docs/database-schema-analysis-report.md`

## ADDED Requirements
### Requirement: Laporan Analisis Skema Database
Sistem (melalui agen analisis) HARUS menghasilkan laporan yang merinci kondisi skema database saat ini berdasarkan standar *best practice*.

#### Scenario: Success case
- **WHEN** agen menyelesaikan analisis terhadap file skema database.
- **THEN** sebuah dokumen laporan berformat Markdown dihasilkan, yang berisi temuan terkait normalisasi, integritas data, performa, dan keamanan, beserta rekomendasi perbaikan.
