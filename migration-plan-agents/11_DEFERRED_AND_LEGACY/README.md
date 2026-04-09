# 11_DEFERRED_AND_LEGACY

Direktori ini berisi dokumentasi untuk fitur yang ditunda (_deferred_), kode legacy yang dipertahankan, dan aturan reaktivasi untuk fitur-fitur yang belum diimplementasikan dalam migrasi dari Supabase ke VIL Backend.

## Ringkasan

Folder ini berfungsi sebagai repositori untuk:

- **Fitur yang Ditunda**: Fitur yang tidak termasuk dalam scope migrasi saat ini tetapi dapat diimplementasikan di masa depan
- **Kode Legacy**: Catatan tentang kode lama yang perlu dipertahankan atau diarsipkan
- **Aturan Reaktivasi**: Panduan kapan dan bagaimana fitur yang ditunda dapat diaktifkan kembali

## Artefak

| File                             | Deskripsi                                                              |
| -------------------------------- | ---------------------------------------------------------------------- |
| README.md                        | Dokumen pengantar (ini)                                                |
| PILOT_FIRST_REVISED_FRAMEWORK.md | Framework eksekusi multi-agent untuk migrasi penuh                     |
| LEGACY_NOTES.md                  | Catatan teknis tentang format task, struktur library, dan requirements |
| REACTIVATION_RULES.md            | Aturan dan prosedur untuk mengaktifkan kembali fitur yang ditunda      |

## Prinsip Dasar

1. **Kode Tidak Dihapus**: Semua kode legacy disimpan untuk referensi dan potential reaktivasi
2. **Dokumentasi Lengkap**: Setiap fitur yang ditunda didokumentasikan dengan lengkap termasuk alasan penundaan
3. **Reaktivasi Terstruktur**: Proses reaktivasi mengikuti aturan yang terdefinisi untuk menghindari konflik
4. **Orchestration First**: Full migration dimungkinkan dengan model eksekusi multi-agent yang terkoordinasi

## Hubungan dengan Folder Lain

- **00_CONTROL_TOWER**: Orchestration utama migrasi
- **10_VIL_BOOTSTRAP_CONTEXT**: Referensi framework VIL
- **09_CROSS_CUTTING_CONCERNS**: Concern lintas fase yang mempengaruhi deferred features
- Folder phases lain: Setiap fase dapat memiliki feature yang di-defer ke folder ini

## Status

Folder ini digunakan untuk:

- Mendokumentasikan scope akhir migrasi
- Menyimpan konteks untuk pengembangan masa depan
- Menyediakan framework untuk eksekusi parallel multi-agent
