# 11_DEFERRED_AND_LEGACY

Direktori ini berisi dokumentasi untuk fitur yang ditunda (_deferred_), kode legacy yang dipertahankan, dan aturan reaktivasi untuk fitur-fitur yang belum diimplementasikan dalam migrasi dari Supabase ke VIL Backend.

## Deferred Features

These features are explicitly OUT OF SCOPE for the current migration. Each has a reason, a re-evaluation point, and criteria for deciding whether to implement.

| Feature                        | Deferred To       | Why Deferred                                                              | Re-evaluate After        |
| ------------------------------ | ----------------- | ------------------------------------------------------------------------- | ------------------------ |
| SCORM Deep Integration         | Post-Phase 3      | Current SCORM works via Edge Function + iframe. Migration adds no value until Edge Functions are migrated. | Phase 3 completion       |
| xAPI Advanced Analytics        | Post-Phase 2      | xAPI basic statements work today. Advanced analytics (aggregation, LRS integration) requires stable VIL services first. | Phase 2 completion       |
| Video Transcoding Pipeline     | Post-Phase 5      | No existing transcoding. Building it requires stable storage layer + worker queue, both Phase 3+ deliverables. | Phase 5 completion       |
| LTI 1.3 Advanced Flows        | Post-Phase 3      | Basic LTI launch works. Deep Roster, Names/Roles, and AGS require stable Edge Function migration. | Phase 3 completion       |
| Real-time Collaborative Editor | Post-Phase 4      | Requires stable WebSocket layer (Phase 4 deliverable) and presence system. | Phase 4 completion       |
| Mobile App (React Native)      | Post-Phase 5      | Web app must be fully migrated and stable before starting a native client. | Phase 5 completion       |

### Re-evaluation Criteria

For each deferred feature, re-evaluate when ALL of these are true:

1. **Phase gate reached** — The "Re-evaluate After" phase is complete and its gate is passed.
2. **No regressions** — All existing features pass parity tests after the preceding phase.
3. **Team capacity** — At least one engineer is available to own the feature end-to-end.
4. **User demand** — The feature has been requested by at least 2 tenant schools, OR it blocks a paid tier.

If any criterion is NOT met, the feature stays deferred. Re-evaluate again at the next phase gate.

### SCORM Deep Integration (Post-Phase 3)

**Current state:** SCORM packages upload via `scorm-extract` Edge Function, play in sandboxed iframe, runtime data stored in `scorm_runtime_data` table. This works and requires no migration until Edge Functions move to VIL.

**What "deep integration" means:** Native SCORM package parsing in Rust, server-side completion tracking without iframe bridge, SCORM 2004 sequencing support.

**Re-evaluation checklist:**
- [ ] Phase 3 gate passed (all Edge Functions migrated to VIL)
- [ ] `scorm-extract` function runs on VIL worker queue
- [ ] At least 2 tenants actively use SCORM content
- [ ] No open bugs in current SCORM iframe implementation

### xAPI Advanced Analytics (Post-Phase 2)

**Current state:** Basic xAPI statements are stored. No aggregation, no LRS federation, no advanced reporting dashboards.

**What "advanced analytics" means:** xAPI statement aggregation pipeline, LRS-compliant API, cross-course learning path analytics, custom report builder.

**Re-evaluation checklist:**
- [ ] Phase 2 gate passed (core services migrated to VIL)
- [ ] Analytics RPC functions migrated to VIL handlers
- [ ] Database migration strategy supports new analytics tables
- [ ] At least 1 tenant requests advanced reporting

### Video Transcoding Pipeline (Post-Phase 5)

**Current state:** Videos are uploaded as-is to Supabase Storage. No transcoding, no adaptive bitrate, no thumbnail generation.

**What "transcoding pipeline" means:** Upload-triggered transcoding (H.264/H.265), adaptive bitrate (HLS), thumbnail extraction, storage in object storage with CDN.

**Re-evaluation checklist:**
- [ ] Phase 5 gate passed (full migration complete)
- [ ] Worker queue (CC7) is production-stable with at least 30 days uptime
- [ ] Storage layer migrated from Supabase Storage to VIL-managed object storage
- [ ] Video content represents > 20% of lesson resources across tenants

## Artefak

| File                             | Deskripsi                                                              |
| -------------------------------- | ---------------------------------------------------------------------- |
| README.md                        | Dokumen pengantar (ini)                                                |
| PILOT_FIRST_REVISED_FRAMEWORK.md | Framework eksekusi multi-agent untuk migrasi penuh                     |
| LEGACY_NOTES.md                  | Catatan teknis tentang format task, struktur library, dan requirements |
| REACTIVATION_RULES.md            | Aturan dan prosedur untuk mengaktifkan kembali fitur yang ditunda      |

## Prinsip Dasar

1. **Kode Tidak Dihapus**: Semua kode legacy disimpan untuk referensi dan potential reaktivasi
2. **Dokumentasi Lengkap**: Setiap fitur yang ditunda didokumentasikan dengan alasan penundaan dan re-evaluation criteria
3. **Reaktivasi Terstruktur**: Proses reaktivasi mengikuti aturan yang terdefinisi di [REACTIVATION_RULES.md](./REACTIVATION_RULES.md)
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
