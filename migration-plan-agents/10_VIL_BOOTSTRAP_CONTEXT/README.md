# 10_VIL_BOOTSTRAP_CONTEXT

Folder ini berisi dokumentasi referensi framework VIL untuk migrasi EduSync dari Supabase ke backend Rust berbasis VIL.

## Isi Folder

| File                       | Deskripsi                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `VIL_FOR_EDUSYNC.md`       | Dokumentasi komprehensif arsitektur VIL, handler patterns, dan setup EduSync                               |
| `RECOMMENDED_PATTERNS.md`  | Pola-pola yang direkomendasikan: security, database, WebSocket, SSE, storage, cron, observability, testing |
| `AVOID_OVERENGINEERING.md` | Anti-patterns dan gotchas yang harus dihindari: SQL, Auth, Multi-Tenant, Frontend                          |

## Tujuan

Folder ini menyediakan konteks teknis bagi agent AI untuk menulis backend EduSync menggunakan framework VIL dengan benar dan konsisten. Semua dokumentasi ditulis dalam Bahasa Indonesia agar tim开发 dapat memahami dengan mudah.

## Sumber

- Repositori: `github.com/OceanOS-id/VIL`
- Dokumentasi: `docs/vil-server/vil-server-guide.md`

## Komponen Utama VIL

VIL (Village Internet Language) adalah process-oriented framework di atas Rust + Axum yang menyediakan:

- **VilApp**: Process topology builder - entry point untuk mendaftarkan services dan mengkonfigurasi mesh
- **ServiceProcess**: Service-as-Process untuk registrasi endpoint dengan prefix dan visibility
- **ServiceCtx**: Process-aware context untuk akses state dan Tri-Lane messaging
- **ShmSlice**: Zero-copy request body via shared memory
- **VilResponse**: SIMD-serialized response dengan method seperti `.ok()`, `.created()`, `.no_content()`
- **VilError**: Error type dengan method `.bad_request()`, `.unauthorized()`, `.internal()`, `.not_found()`
- **VxMeshConfig**: Tri-Lane routing untuk inter-service messaging

## Cara Menggunakan

1. Baca `VIL_FOR_EDUSYNC.md` untuk memahami arsitektur dasar dan setup
2. Lihat `RECOMMENDED_PATTERNS.md` untuk pola-pola yang sudah terbukti
3. Selalu referensikan `AVOID_OVERENGINEERING.md` agar tidak melakukan kesalahan umum
