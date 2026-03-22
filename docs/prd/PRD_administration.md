# PRD — Administration (Administrasi)

**Versi:** 1.0
**Tanggal:** 2026-03-22
**Status:** Draft
**Author:** Head of Product, EduSync
**Feature Module:** `src/features/administration/`

---

## 1. Problem Statement

Sekolah-sekolah Indonesia saat ini mengandalkan spreadsheet dan sistem manual untuk mengelola konfigurasi tenant, fitur, dan pengaturan sekolah. Admin sekolah tidak memiliki dashboard terpusat untuk:

- Mengaktifkan/menonaktifkan fitur per-sekolah (toggle fitur premium vs paket gratis)
- Mengelola pengaturan akademik (tahun ajaran, kurikulum, kalender libur)
- Mengelola pengguna massal (saat ini harus tambah satu per satu — pain point utama)
- Melacak aktivitas dan perubahan (audit trail)
- Mengelola billing dan subscription status

**Dampak:** Admin membuang 5-10 jam per minggu untuk administrative overhead. Sekolah kesulitan skalabilitas, dan tidak ada visibility ke dalam operasi sistem. Potensi compliance issue karena tidak ada audit trail yang jelas.

**Cost of Not Solving:** Churn admin, bottleneck onboarding sekolah baru, tidak bisa enforce tenant-specific rules (misal: disable discussions untuk sekolah tertentu).

---

## 2. Goals

1. **Centralized Admin Control**: Admin sekolah punya satu dashboard untuk semua konfigurasi tenant dan pengaturan operasional.
2. **Bulk User Import**: Admin bisa import 100+ pengguna dari CSV dalam sekali jalan, bukan one-by-one.
3. **Feature Toggle**: Admin bisa aktifkan/matikan fitur per-sekolah tanpa coding (misal: toggle "Moderation" untuk sekolah tertentu).
4. **Audit Trail**: Semua perubahan dicatat dan terlihat di dashboard (siapa, apa, kapan, kenapa).
5. **Operational Efficiency**: Kurangi admin overhead dari 5-10 jam/minggu menjadi <2 jam/minggu.

---

## 3. Non-Goals

- **Super-admin Portal**: v1 tidak ada platform-level super-admin. Admin hanya manage tenant mereka sendiri.
- **Advanced Billing Integration**: v1 tidak ada pembayaran online real-time. Billing masih manual (admin sekolah lihat invoice saja).
- **Multi-tenant Admin Hierarchy**: v1 hanya 1 admin per tenant. Tidak ada sub-admin atau admin dengan limited scope.
- **API Quota Management**: v1 tidak ada rate limiting atau quota system per-fitur.
- **Tenant Migration/Merge**: v1 tidak ada tooling untuk migrate data antar tenant.

---

## 4. User Stories

### Untuk Admin Sekolah

- As an admin, I want to view all users in my school and their roles so that I can audit who has access to what.
- As an admin, I want to bulk import users from a CSV file so that I can save time instead of adding them manually one by one.
- As an admin, I want to enable/disable features (like "Discussions" or "Gamification") for my school so that I can customize the platform to our needs.
- As an admin, I want to view an audit log of all changes (user added, feature toggled, settings changed) so that I can track who did what and when.
- As an admin, I want to view my school's billing status and invoice history so that I can manage payment and budgeting.
- As an admin, I want to set academic calendar configuration (year, semester dates, holiday dates) so that the system can enforce deadlines correctly.
- As an admin, I want to configure school branding (logo, school name) so that the platform feels cohesive with our identity.
- As an admin, I want to reset a student's password or unlock an account so that I can help students who are locked out.

### Untuk Platform Engineer (Support/Ops)

- As a platform engineer, I want to debug a tenant's configuration without accessing their data so that I can troubleshoot issues.
- As a platform engineer, I want to view feature flag status across all tenants so that I can track rollout progress.

---

## 5. Requirements

### P0 — Must Have

| Requirement                  | Acceptance Criteria                                                                                                                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **User Management Page**     | Admin dapat melihat tabel semua pengguna di sekolahnya dengan kolom: nama, email, role, created_at, last_login. Tabel sorted, paginated (50/page), searchable by name/email.                                     |
| **Add/Edit User**            | Admin dapat buat user baru atau edit existing user: ubah nama, email, role. Role picker: STUDENT/TEACHER/ADMIN.                                                                                                  |
| **Bulk Import CSV**          | Admin bisa upload CSV dengan kolom: email, nama, role. Validasi: email format, role value, duplicate detection. Output: success count, error list (row number + reason). Store import history.                   |
| **Feature Toggle Dashboard** | Admin lihat toggle untuk setiap fitur (Discussions, Moderation, Gamification, Calendar, etc.) per-sekolah. Toggle state disimpan di `tenants.feature_flags` (JSON). Real-time sync via React Query invalidation. |
| **Audit Log Viewer**         | Halaman menampilkan tabel activity log: tanggal, user, action (add_user, toggle_feature, change_setting), resource, old_value, new_value. Filter by date range, action type, user. Paginated.                    |
| **School Settings Form**     | Admin konfigurasi: school_name, school_code, timezone, academic_year, semester_start, semester_end. Validasi date ranges. Save via RPC.                                                                          |
| **Billing Dashboard**        | Display: current subscription status, invoice history (table dengan date, amount, status), payment method. Tidak ada payment processing (link to Stripe/payment provider portal).                                |
| **Loading States**           | All pages have skeleton loaders. No blank screens while loading (performance issue reported).                                                                                                                    |
| **Dark Mode Support**        | All new components support dark: variants. Test at class="dark" on html.                                                                                                                                         |
| **Error Handling**           | Meaningful error messages in Bahasa Indonesia (translate Supabase errors). Retry logic for transient failures.                                                                                                   |

### P1 — Nice to Have

| Requirement                       | Notes                                                                                                 |
| --------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Bulk User Delete**              | Admin bisa select multiple users dan delete sekaligus (dengan confirmation dialog).                   |
| **User Export**                   | Admin bisa export user list ke CSV (nama, email, role, created_at).                                   |
| **Activity Search**               | Full-text search di audit log oleh user name, resource name.                                          |
| **Bulk Role Change**              | Admin select users dan ubah role semuanya ke TEACHER misal (dengan confirmation).                     |
| **Tenant Branding Customization** | Upload logo, custom CSS, warna theme (simpan blob di storage).                                        |
| **Notification Settings**         | Admin konfigurasi email notifications (on/off) untuk berbagai event (user signup, failed quiz, etc.). |
| **Data Retention Policy**         | Admin set berapa hari data harus di-keep (misal: hapus quiz attempts setelah 1 tahun).                |
| **School Statistics Widget**      | Summary card: total users, total courses, active students today, avg quiz score.                      |

### P2 — Future Considerations

- **SSO Integration** (Google Workspace, Microsoft Entra): Auto-sync users dari IdP, auto-login.
- **Advanced Permissions**: Sub-admin dengan limited scope (misal: admin yang hanya bisa manage users, tidak feature toggle).
- **Tenant Quota**: Enforce limit (max 500 students, max 20 courses). Show usage meter.
- **Platform-level Dashboard**: Super-admin portal untuk melihat semua tenants, revenue, feature rollout.
- **API Keys & Webhooks**: Admin generate API key untuk custom integrations.
- **LTI Integration**: Admin configure LTI provider settings untuk integrase dengan sistem pihak ketiga.

---

## 6. Success Metrics

### Leading Indicators (berubah cepat, hari–minggu)

- **CSV Import Success Rate**: Target 95%+ berhasil (error rate <5%).
- **Audit Log Capture**: 100% of admin actions logged (tested via RLS + trigger).
- **Feature Toggle Propagation**: Toggle changes reflect in UI <500ms (React Query invalidation).
- **Page Load Time**: Administration dashboard loads in <2s (cached queries, skeleton show immediately).

### Lagging Indicators (berubah lambat, minggu–bulan)

- **Admin Time Spent**: Reduce admin overhead from 5-10 hrs/week to <2 hrs/week (survey existing admins).
- **User Management Errors**: Zero support tickets about "user not added" due to manual entry mistakes (CSV import accuracy).
- **Feature Adoption**: >80% of schools toggle at least one feature (adoption of feature customization).
- **Audit Compliance**: 100% audit trail coverage for compliance (no missing logs).

---

## 7. Open Questions

| #   | Pertanyaan                                                                                                          | Owner                | Blocking?                                   |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------------------- | ------------------------------------------- |
| 1   | Berapa banyak kolom bisa di-customize di CSV import? (email, nama, role, cukup atau butuh NIS, nomor telepon, dll?) | Product/Design       | Tidak — start dengan minimal, expand nanti  |
| 2   | Apakah super-admin platform perlu akses ke tenant admin panel (untuk debug)?                                        | Engineering/Security | Ya — perlu clarify permission model         |
| 3   | Apakah bulk delete user perlu approval workflow atau instant delete aman?                                           | Product/Legal        | Ya — perlu policy approval                  |
| 4   | Apa retention period default untuk audit logs? (3 bulan, 1 tahun, unlimited?)                                       | Product/Compliance   | Tidak — default 1 tahun, configurable nanti |
| 5   | Apakah timezone setting perlu per-user atau per-school only?                                                        | Product/Design       | Tidak — per-school dulu, per-user di v2     |

---

## 8. Timeline & Phases

**Phase 1 (Week 1-2): MVP**

- User management (view, add, edit, delete)
- Basic audit log
- School settings form
- Feature toggle dashboard

**Phase 2 (Week 3-4): CSV Import & Billing**

- Bulk CSV import with validation
- Billing dashboard (view-only)
- Improved audit log filtering

**Phase 3 (Week 5-6): Polish & Rollout**

- Loading states (skeleton loaders)
- Error handling & translations
- Dark mode support
- QA & bug fixes
- Gradual rollout to beta schools

**Hard Deadline**: 2026-04-30 (admin feature complete + live on 5 pilot schools)

---

## 9. Dependensi & Risiko

### Technical Dependencies

- `tenants` table — must have `feature_flags` JSON column (already exists in schema)
- `activity_logs` table + RLS policy — must capture all admin actions (RPC side-effects)
- `user_roles` table — must have tenant_id + role columns for RLS isolation
- React Query v5 — for server state management, invalidation on mutations
- Supabase Edge Function (optional) — for CSV processing if >1MB file size

### Integration Risks

- **CSV Upload File Size**: Large files (10k+ rows) may timeout. Mitigation: Process async via Edge Function + store import job in `import_jobs` table.
- **RLS Policy Complexity**: Audit log must be readable by tenant admin only. Risk: overly permissive policy leaks data. Mitigation: policy = `(tenant_id = get_my_tenant_id() AND role_is_admin())`.
- **Concurrent Edits**: If admin A and B edit settings at same time, last-write-wins. Mitigation: add `updated_at` timestamp, show conflict dialog.
- **Password Reset**: If admin resets student password, old password hashes are still in auth.users table. Mitigation: Supabase doesn't expose hashes; we only call `supabase.auth.admin.updateUserById()` (safe).

### Edge Cases

- **Deleted User**: If user deleted but still referenced in quiz_attempts, orphaned records remain. Mitigation: soft delete (add `deleted_at` column), no hard delete in v1.
- **Role Change During Session**: If admin changes own role to non-admin mid-session, UI may show blank. Mitigation: `useAuth()` refetch on every page focus; show logout warning if role downgraded.
- **Bulk Import Partial Failure**: If 500 of 1000 rows fail, import still succeeds (partial). Mitigation: Transactional import — all or nothing. If any row fails, rollback entire import.
- **Audit Log Leakage**: Platform engineer should not see specific audit logs for other tenants. Mitigation: All audit log queries use RLS (tenant_id isolation).

---

## 10. Design & UX Notes

- **Skeleton Loaders**: Administration page had blank 10-20s load time (reported issue). All pages must show skeleton immediately, then populate.
- **Confirmation Dialogs**: Any destructive action (delete user, toggle feature) must have confirmation. Confirmation text includes what will happen.
- **Feedback**: After CSV import, show toast with success count + any errors. After toggle feature, invalidate React Query and show toast "Fitur X diaktifkan".
- **Mobile Responsiveness**: Admin pages are desktop-focused, but should work on tablet. Stack columns on mobile.
- **Accessibility**: ARIA labels for toggles, buttons. Tab navigation for forms. Error messages linked to fields.

---

## 11. Metrics Dashboard View

```
┌─────────────────────────────────────────┐
│  Administrasi — [School Name]           │
├─────────────────────────────────────────┤
│ 📊 Stats:                               │
│   • Total Pengguna: 234                 │
│   • Pengguna Aktif (7 hari): 156        │
│   • Guru: 12 | Siswa: 222               │
├─────────────────────────────────────────┤
│ ⚙️  Feature Toggles:                    │
│   ☑ Discussions        ☐ Moderation     │
│   ☑ Gamification       ☑ Calendar       │
├─────────────────────────────────────────┤
│ 👥 Manajemen Pengguna: [View] [+ Import]│
│ 📋 Audit Log: [View]                    │
│ 💰 Billing: [View]                      │
│ ⚙️  Pengaturan Sekolah: [Edit]          │
└─────────────────────────────────────────┘
```

---

## 12. Database Schema References

**Tables Involved:**

- `tenants` (feature_flags: JSON, school_name, timezone, academic_year, etc.)
- `profiles` (name, email, avatar_url)
- `user_roles` (user_id, role, tenant_id)
- `activity_logs` (user_id, action, resource, old_value, new_value, created_at, tenant_id)
- `import_jobs` (id, file_key, status, row_count, error_count, created_at, created_by, tenant_id) [NEW]

**RPC Functions:**

- `toggle_feature(feature_name, enabled)` — SET feature_flags[feature_name] = enabled
- `create_user_bulk(csv_data: jsonb)` — Insert multiple users in transaction
- `log_activity(action, resource, old_val, new_val)` — Create audit log entry (auto-called by triggers)
- `export_users()` — Return CSV format user list

**RLS Policies:**

- Audit log: `tenant_id = get_my_tenant_id() AND (is_admin OR is_owner)`
- Feature flags: `tenant_id = get_my_tenant_id()`
- Activity log: visible to admin only

---

## 13. Success Checklist (Dev)

- [ ] User management page + CRUD
- [ ] CSV import with validation + error reporting
- [ ] Feature toggle dashboard (read + write)
- [ ] Audit log viewer with filters
- [ ] School settings form
- [ ] Billing dashboard (read-only)
- [ ] Skeleton loaders on all pages
- [ ] Dark mode support (dark: variants)
- [ ] Error handling + Bahasa Indonesia translations
- [ ] RLS policies locked down per tenant
- [ ] React Query hooks + invalidation logic
- [ ] Unit tests (>80% coverage)
- [ ] E2E tests (CSV import, feature toggle, audit log)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Mobile responsiveness test
- [ ] Performance: FCP <1s, LCP <3s, CLS <0.1
- [ ] Documentation: README.md in feature module
