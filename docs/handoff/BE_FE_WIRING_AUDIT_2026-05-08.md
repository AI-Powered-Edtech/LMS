# Audit BE ↔ FE wiring + UI/UX maturity — 2026-05-08 (revisi)

Audit ulang dengan parser VIL `ServiceProcess.endpoint()` yang benar. Menggantikan revisi sebelumnya yang gagal (regex axum tidak cocok dengan VIL).

> **⚠️ UPDATE (post-verification):** Investigasi handler signature menemukan bahwa real handler `reports/export` + `plagiarism/check` adalah dead code (axum-style), tidak kompatibel dengan VIL `.endpoint()`. Routing TIDAK bisa di-swap dengan 1 baris. Lihat §11 untuk koreksi P0 lengkap.


## TL;DR

- **Backend endpoints VIL:** 95 di 16 services.
- **FE-consumed paths:** 51 unik di `src/`.
- **Wired (BE ↔ FE match):** 42 (44%).
- **Unwired BE:** 53 — setelah kategorisasi, hanya **35** yang berpotensi butuh kerjaan FE; sisanya intentional-internal (probe, webhook, OAuth callback, dynamic dispatch).
- **FE ghost calls (FE memanggil tapi BE tidak ada):** 10 — mostly proxied via dynamic builder (e.g. `/api/v1/data/<table>` template literal).

### Dampak UX langsung (sebelum diatasi)

- **13 gambar tanpa `alt`** → user pakai screen reader dapat "image" generik tanpa konteks; gagal WCAG 2.2 SC 1.1.1.
- **934 ID + 372 EN string ter-hardcode** → saat user pilih bahasa lain, copy tidak ter-translate; teacher Indonesia lihat "Loading..." alih-alih "Memuat...".
- **`scorm_runtime_stub_handler` masih stub** → user yang upload SCORM sukses, tapi saat play → lihat error "501 Not Implemented", lessons gagal di-track xAPI.
- **`ai_tutor_stream_stub_handler` masih co-exist dengan handler real** → risiko routing ganda kalau salah deploy; user bisa stuck di "thinking..." tanpa stream output.
- **35 BE endpoints belum punya FE caller** → fitur dibangun tapi user tidak bisa akses dari UI; engineering waste + user confusion saat partial rollout.

## 1. Inventaris BE

### Service breakdown (12 service, prefix-based)

| Service | Prefix | Endpoints |
|---|---|---|
| `system` | `/api/v1` | 2 |
| `auth` | `/api/v1/auth` | 23 |
| `courses` | `/api/v1` | 12 |
| `tenant-invites` | `/api/v1` | 3 |
| `course-templates` | `/api/v1` | 5 |
| `onboarding` | `/api/v1` | 2 |
| `tenant-admin` | `/api/v1` | 5 |
| `data` | `/api/v1` | 2 |
| `observability` | `/api/v1/internal` | 2 |
| `ai` | `/api/v1/ai` | 4 |
| `lti` | `/api/v1/lti` | 3 |
| `notifications` | `/api/v1` | 11 |
| `processing` | `/api/v1` | 4 |
| `realtime` | `/ws` | 1 |
| `storage` | `/api/v1/storage` | 8 |
| `stubs` | `/api/v1` | 8 |

### Distribusi method

- `POST` — 58
- `GET` — 29
- `DELETE` — 6
- `PUT` — 1
- `PATCH` — 1

## 2. Wired BE ↔ FE

42 routes punya FE caller. Sample (10 pertama):

```
GET    /api/v1/health                                          (system)
POST   /api/v1/auth/register                                   (auth)
POST   /api/v1/auth/login                                      (auth)
POST   /api/v1/auth/signout                                    (auth)
POST   /api/v1/auth/refresh                                    (auth)
POST   /api/v1/auth/switch-tenant                              (auth)
GET    /api/v1/auth/bootstrap                                  (auth)
POST   /api/v1/auth/ensure-profile                             (auth)
POST   /api/v1/auth/reset-password                             (auth)
POST   /api/v1/auth/update-password                            (auth)
```

## 3. Unwired BE — kategorisasi

### POTENTIAL FE-TODO — 35

**Ini yang worth difile sebagai `fe-todo` GH issue setelah verifikasi manual** (mungkin ada false-positive karena URL dibangun dynamic).

**Dampak UX kalau dibiarkan:** fitur ini live di backend tapi user tidak bisa akses dari UI — admin yang tahu bisa pakai via API console; user biasa tidak bisa.

```
GET    /api/v1/auth/callback/google                            (auth)
GET    /api/v1/courses/:id                                     (courses)
PUT    /api/v1/courses/:id                                     (courses)
DELETE /api/v1/courses/:id                                     (courses)
GET    /api/v1/courses/:id/modules                             (courses)
POST   /api/v1/courses/:id/submit-review                       (courses)
POST   /api/v1/courses/:id/review                              (courses)
GET    /api/v1/courses/:id/reviews                             (courses)
POST   /api/v1/courses/:id/copy                                (courses)
POST   /api/v1/courses/:id/modules/reorder                     (courses)
POST   /api/v1/modules/:id/lessons/reorder                     (courses)
POST   /api/v1/tenant-invites                                  (tenant-invites)
GET    /api/v1/tenant-invites                                  (tenant-invites)
DELETE /api/v1/tenant-invites/:id                              (tenant-invites)
POST   /api/v1/course-templates                                (course-templates)
GET    /api/v1/course-templates                                (course-templates)
GET    /api/v1/course-templates/:id                            (course-templates)
POST   /api/v1/course-templates/:id/instantiate                (course-templates)
DELETE /api/v1/course-templates/:id                            (course-templates)
GET    /api/v1/onboarding                                      (onboarding)
POST   /api/v1/onboarding                                      (onboarding)
GET    /api/v1/tenant-settings                                 (tenant-admin)
PATCH  /api/v1/tenant-settings                                 (tenant-admin)
GET    /api/v1/tenant-members                                  (tenant-admin)
POST   /api/v1/tenant-members/:user_id/roles                   (tenant-admin)
DELETE /api/v1/tenant-members/:user_id/roles/:role             (tenant-admin)
POST   /api/v1/push/send                                       (notifications)
POST   /api/v1/whatsapp/send-otp                               (notifications)
POST   /api/v1/whatsapp/verify-otp                             (notifications)
POST   /api/v1/pdf/rapor/:rapor_id                             (notifications)
POST   /api/v1/rapor/:rapor_id/sign                            (notifications)
POST   /api/v1/rapor/:rapor_id/publish                         (notifications)
POST   /api/v1/progress                                        (processing)
GET    /api/v1/quiz/:quiz_id/load                              (processing)
GET    /api/v1/reports/export/:id                              (stubs)
```

### auth-misc — 3

```
GET    /api/v1/auth/sessions                                   (auth)
POST   /api/v1/auth/sessions/revoke                            (auth)
POST   /api/v1/auth/onboard-student                            (auth)
```

### data-plane (dynamic) — 2

**Wired via dynamic builder** di `vilApiClient.ts::request()`. Pattern `/data/:table` dipanggil sebagai `/data/courses`, `/data/users` dsb. False-positive di suffix-match.

```
POST   /api/v1/data/:table                                     (data)
POST   /api/v1/rpc/:name                                       (data)
```

### internal — 1

```
GET    /api/v1/internal/shadow-config                          (observability)
```

### lti — 3

**LMS-integration callback.** Dipanggil dari Canvas/Moodle launcher, bukan FE EduSync.

```
GET    /api/v1/lti/jwks                                        (lti)
GET    /api/v1/lti/oidc-login                                  (lti)
POST   /api/v1/lti/launch                                      (lti)
```

### probe — 1

**Intentional-internal.** K8s liveness/readiness. Tidak perlu FE.

```
GET    /api/v1/ready                                           (system)
```

### storage (dynamic-path) — 5

**Wired via dynamic path** — `/storage/object/:bucket/*path` dipanggil dengan bucket + path runtime. False-positive di suffix-match.

```
GET    /api/v1/storage/object/:bucket/*path                    (storage)
DELETE /api/v1/storage/object/:bucket                          (storage)
GET    /api/v1/storage/public-url/:bucket/*path                (storage)
GET    /api/v1/storage/list/:bucket                            (storage)
GET    /api/v1/storage/migration-status                        (storage)
```

### webhook — 3

**Intentional-internal.** Dipanggil oleh third-party (WhatsApp, Midtrans). Tidak perlu FE.

```
GET    /api/v1/webhooks/whatsapp                               (notifications)
POST   /api/v1/webhooks/whatsapp                               (notifications)
POST   /api/v1/webhooks/midtrans                               (notifications)
```

## 4. FE ghost calls — FE memanggil tapi BE-side tidak terdaftar

10 path. Mayoritas adalah suffix dari dynamic-builder calls (e.g. `/api/v1/data/courses`, `/api/v1/storage/object/lesson-assets/...`). Cek manual:

```
/api/v1/
/api/v1/ai/chat
/api/v1/ai/chat/stream
/api/v1/ai/recommend-learning-path
/api/v1/data
/api/v1/rate-limit
/api/v1/rpc
/api/v1/storage/list
/api/v1/storage/object
/api/v1/storage/transcode-status
```

## 5. Stub handlers — BE secara eksplisit "not yet"

Defined di `edusync-api/crates/api-server/src/stub_handlers.rs`:

```
executive_report_stub_handler
parent_report_stub_handler
reports_export_create_stub_handler
reports_export_status_stub_handler
plagiarism_check_stub_handler
ai_tutor_stream_stub_handler
scorm_runtime_stub_handler
```

| Stub | Real handler | Status | Dampak UX |
|---|---|---|---|
| `executive_report_stub_handler` | `report_real.rs::executive_report_handler` | Real shipped | None (sudah pakai real) |
| `parent_report_stub_handler` | `report_real.rs::parent_report_handler` | Real shipped | None |
| `reports_export_create_stub_handler` | `report_handlers.rs::export_report_handler` | Real shipped | Stub masih wired di main.rs:483 — kalau stub dipanggil duluan, user yang export raport dapat job-id tapi tidak ada worker yang proses. **Cek wiring.** |
| `reports_export_status_stub_handler` | `report_handlers.rs::get_export_status_handler` | Real shipped | Sama — user tunggu status forever karena stub return canned response. |
| `plagiarism_check_stub_handler` | `plagiarism_handlers.rs::check_plagiarism_handler` | Real shipped | Stub masih wired — teacher yang minta check plagiarism dapat "pending" abadi. |
| `ai_tutor_stream_stub_handler` | `ai_tutor_real.rs::ai_tutor_stream_handler` | Real shipped (G2, e15c1a6ac) | Real handler is wired. Stub tetap di file tapi tidak terpanggil. **Decommission via #321** setelah smoke test #320. |
| `scorm_runtime_stub_handler` | (none) | **NOT IMPLEMENTED** | **⚠️ Production blocker untuk SCORM.** User upload SCORM ZIP berhasil, tapi saat lesson play → player kirim xAPI ke `/api/v1/scorm/runtime` → dapat 200 OK kosong, progress tidak tercatat, completion tidak terdeteksi. |

## 6. UI/UX maturity scorecard

| Kategori | Metric | Score | Verdict | Dampak UX |
|---|---|---|---|---|
| Error handling | `ErrorBoundary` refs | 141 | ✅ excellent | User lihat fallback yang ramah, bukan blank screen, kalau ada crash component-level. |
| Loading states | `isLoading`/`Skeleton` | 1066 | ✅ excellent | Perceived performance bagus — user lihat skeleton, bukan flicker putih. |
| Empty states | `EmptyState` refs | 181 | ✅ excellent | Kalau list kosong (mis. tidak ada course), user dapat CTA jelas, bukan layar kosong yang membingungkan. |
| a11y | `aria-*` attrs | 730 | ✅ sangat baik | Screen reader user dapat label benar di sebagian besar interaksi. |
| | `<img alt>` | 2/15 | ⚠️ 13 hilang | Screen reader cuma dapat "image" generic untuk avatar, certificate, course thumbnail. WCAG 1.1.1 fail. |
| i18n | `useTranslation` refs | 11 | ✅ wired | react-i18next hidup. |
| | hardcode ID strings | 934 | ⚠️ migrate ke t() | Kalau user pilih EN, masih lihat "Mohon tunggu" alih-alih "Please wait". |
| | hardcode EN strings | 372 | ⚠️ migrate ke t() | User Indonesia dapat "Loading..." hardcoded. |
| Mobile | Tailwind responsive | 659 sites | ✅ cukup | Layout adapt di mobile; perlu QA per-flow untuk gradebook + course-builder yang heavy desktop. |
| Forms | RHF | 16 | ✅ | UX form bagus — inline validation, no full reload. |
| | zod | 0 | ❌ not used | Risk: BE response shape drift bisa crash UI tanpa runtime guard. |
| Feedback | sonner/Toaster direct | 16 | check wrapper | Kalau wrapper hilang, user tidak dapat feedback "saved!" / "error" pada submit. |
| | wrapper (`notify.`/`useNotify`) | 0 | review | |
| Code hygiene | TODO/FIXME | 11 | ✅ small | Tidak ada debt yang membingungkan reviewer. |
| | console.* | 9 | ✅ tiny | Tidak bocor PII ke browser console. |
| Perf | Lazy/Suspense | 155 | ✅ excellent | First-paint cepat — user tidak download bundle yang tidak relevan ke role-nya. |
| Observability | Sentry | 1 ref | ✅ wired | Bug auto-reported; tim bisa fix sebelum user complain. |
| Offline/PWA | offline queue | yes | ✅ wired | Murid offline (signal jelek di sekolah pelosok) tetap bisa submit quiz, sync saat online. |

## 7. Production-grade gap list

### P0 — BLOCK launch

1. **`scorm_runtime_stub_handler` belum ada real handler.**
   - **Dampak UX:** Teacher upload SCORM (mis. modul Quipper, Ruangguru content) → user play → progress tidak tercatat → student tidak bisa selesaikan course.
   - **Action:** Implement `scorm_runtime_real.rs` (xAPI receiver) atau feature-flag SCORM block off di FE sampai shipped.
2. **Migration 13 `<img>` ke alt-text.**
   - **Dampak UX:** Sekolah inklusi (ada anak tunanetra) tidak bisa pakai EduSync. Audit WCAG akan fail.
   - **Action:** ESLint `jsx-a11y/alt-text` sudah aktif tapi disabled di banyak file. Jalankan `pnpm lint --fix` + manual review per chunk.
3. **i18n string sweep.**
   - **Dampak UX:** 934+372 string ter-hardcode → setting bahasa user partially diabaikan. Confusing untuk parent yang switch ke EN tapi masih lihat "Berhasil".
   - **Action:** Sweep PR per feature — wrap `t("key")` + tambah ke `id.json`/`en.json`.
4. **Decommission `ai_tutor_stream_stub_handler`.**
   - **Dampak UX:** Stub di-route hanya kalau wiring drift; risiko medium. Tapi keberadaannya = drift hazard.
   - **Action:** Tunggu smoke test #320 pass, lalu hapus stub via #321 (operator).

### P1 — strongly recommended

5. **Triage 35 "potential FE-todo" routes (§3).**
   - **Dampak UX:** Setiap row yang ternyata real fe-todo = fitur invisible ke user. Worst case: admin frustrasi karena fitur "ada di docs tapi tidak di UI".
6. **Stub-handler split-routing audit.** `reports_export_*` dan `plagiarism_check_*` punya real + stub. Kalau routing prioritas salah → user tunggu export forever.
   - **Action:** Pastikan di `main.rs` hanya real handler yang di-wire untuk endpoint ini.
7. **Toast wrapper audit.** Direct sonner = 16, wrapper = 0. Kalau wrapper diam-diam regress, user tidak dapat feedback save/error.
8. **TODO debt (11).** 3 di `ai-builder-copilot/api` (BE endpoint belum ada) → tombol "Generate outline" di FE click → fallback ke proxy → hasilnya generic, bukan course-tailored.

### P2 — quality polish

9. **zod adoption (0 → target 16).** Forms yang sekarang RHF-only akan stabil sampai BE response shape berubah; lalu UI crash di prod tanpa peringatan dini. Add zodResolver per top form.
10. **Bundle-size audit.** Lazy/Suspense {LAZY} sites bagus, tapi confirm via `pnpm bundlesize` per release. User di mobile 3G yang download 5MB chunk = abandon.
11. **i18n untuk `mention-date` formats.** Saat ini DD/MM/YYYY hardcoded di beberapa formatters. User EN expect MM/DD/YYYY.

## 8. Sandbox-tractable next steps

1. Cek wiring `reports/export` + `plagiarism/check` di `main.rs` — confirm real handler menang dari stub. **(quick fix kalau salah)**
2. Implement `scorm_runtime_real.rs` (xAPI statement receiver, store ke `xapi_statements` table).
3. Generate fe-todo issue per row di §3 setelah review manual.
4. ESLint `jsx-a11y/alt-text` enforce: `pnpm lint --fix src/`.
5. zod schema per `useForm()` site — bisa di-batch lewat codemod.

## 9. Methodology

- BE extracted via Python regex `re.compile(r'\.endpoint\(\s*Method::(\w+)\s*,\s*"([^"]+)"') sliced per `let X_service = ServiceProcess::new("...")` block, prefix-composed dari `.prefix(...)`.
- FE extracted via regex `/api/v1/[\w\-/{}.:*]+|/ws[\w/]*` over `.ts`/`.tsx` di `src/`.
- Diff is normalized-path equality (`:id`, `{id}`, `*splat` → `{}`).
- UI/UX metrics adalah grep-line-counts; trend reliable, absolute angka mungkin overcounting (multi-match per line).

## 10. Cross-references

- `docs/handoff/SWEEP_TRIAGE_FULL_2026-05-08.md`
- `docs/handoff/G2_SMOKE_TEST.md`
- `docs/handoff/ROMBEL_ROLLBACK.md`
- `docs/handoff/JWT_KEY_AUDIT_2026-05-08.md`

## 11. CORRECTION (post-verification): axum ↔ VIL signature mismatch

Verification setelah doc draft pertama menemukan bahwa "real handlers" untuk `reports/export` dan `plagiarism/check` **bukan drop-in replacement untuk stubs**.

### Akar masalah

- Stub handlers di `stub_handlers.rs` pakai **VIL extractor pattern**:
  ```rust
  pub async fn reports_export_create_stub_handler(
      AuthedRequest(_ctx): AuthedRequest,
      _svc: ServiceCtx,
      body: ShmSlice,
  ) -> HandlerResult<VilResponse<serde_json::Value>>
  ```
- "Real" handlers di `report_handlers.rs` + `plagiarism_handlers.rs` pakai **axum extractor pattern**:
  ```rust
  pub async fn export_report_handler(
      AuthedRequest { user_id, tenant_id, db, .. }: AuthedRequest,
      State(state): State<Arc<AppState>>,
      Json(req): Json<edusync_services::reports::ExportReportRequest>,
  ) -> Result<Json<serde_json::Value>, (StatusCode, Json<serde_json::Value>)>
  ```

Keduanya **tidak compile-compatible** dengan `vil_server::ServiceProcess::endpoint(...)`. Jadi swap satu baris di `main.rs` akan langsung break build.

### Implikasi (CORRECTS §5 + §7)

- **`reports/export` + `reports/export/:id` + `plagiarism/check` saat ini hanya ada sebagai stub di prod.** Real handlers adalah **dead code** (didefinisikan tapi tidak pernah ter-route).
- User yang panggil endpoint-endpoint ini selalu dapat:
  - `reports/export` POST: `{ jobId: "...", status: "queued", reportType, format }` palsu — tidak ada worker yang proses.
  - `reports/export/:id` GET: canned `{ status: "completed", downloadUrl: null }` — user lihat "completed" tanpa file.
  - `plagiarism/check`: `{ success: true, stub: true, ... }` — frontend mungkin error decode kalau tidak antisipasi `stub: true`.
- **Real handlers butuh rewrite ke VIL pattern** (~1–2 hari engineering) sebelum bisa di-route. Ini bukan task sandbox-tractable; perlu local cargo + test.

### Updated P0 list

1. ~~Swap stub-routing untuk reports/export + plagiarism/check~~ → **TIDAK BISA**, signature tidak kompatibel.
2. **NEW P0:** Rewrite `export_report_handler`, `get_export_status_handler`, `check_plagiarism_handler` dari axum-style → VIL-style:
   - Replace `State<Arc<AppState>>` → `_svc: ServiceCtx` + `extension::<Arc<AppState>>()`.
   - Replace `Json<T>` request body → `body: ShmSlice` + `body.json::<T>()`.
   - Replace `Result<Json<...>, (StatusCode, Json<...>)>` return → `HandlerResult<VilResponse<serde_json::Value>>`.
   - Replace `Path<Uuid>` → `_svc.path_param::<Uuid>("id")`.
   - Then update `main.rs` imports + `.endpoint()` registrations.
3. **Fallback feature-flag (UX safety):** Sampai #2 selesai, tampilkan banner di FE feature `reports/exports` dan `plagiarism`: "Fitur sedang dalam pengembangan, hasil belum final." Mengurangi user frustration karena tidak menunggu hasil yang tidak datang.

### Dampak UX kalau dibiarkan

- **Kepala sekolah:** klik "Export Raport Eksekutif" → dapat job-id → cek status → "completed" tapi `downloadUrl: null` → bingung, kontak support.
- **Teacher:** tugaskan plagiarism check di assignment → status "completed" instant tapi `similarityScore: 0` selalu → turun trust pada AI feature, balik ke manual review.
- **Trust signal regression:** dua fitur premium-positioned yang dijual ke sekolah ternyata stub. Kalau ketahuan client, churn risk tinggi.

### Rekomendasi prioritas

Kalau timeline ketat menjelang launch:
- **Minggu 1:** Implement #3 fallback flag + banner. UX langsung lebih jujur.
- **Minggu 2–3:** Rewrite ke VIL (issue baru di GH, tag `priority:p0` `migration:axum-to-vil`).
- **Minggu 4:** Decommission stubs setelah real handler hidup.
