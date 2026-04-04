# Phase 30 RLS Security Audit

## Date: 2026-04-02

## Auditor: AI Security Review

## Scope: Phase 29-30 migrations (parent & principal roles)

---

## Tabel yang Diaudit

| #   | Tabel                     | Migration File                              |
| --- | ------------------------- | ------------------------------------------- |
| 1   | `student_parent_links`    | `20260402000007_parent_principal_roles.sql` |
| 2   | `principal_settings`      | `20260402000007_parent_principal_roles.sql` |
| 3   | `parent_otp_codes`        | `20260402000008_parent_otp.sql`             |
| 4   | `parent_digest_settings`  | `20260402000009_parent_digest.sql`          |
| 5   | `parent_teacher_threads`  | `20260402000010_parent_messages.sql`        |
| 6   | `parent_teacher_messages` | `20260402000010_parent_messages.sql`        |
| 7   | `school_baseline_metrics` | `20260402000011_before_after_analytics.sql` |
| 8   | `satisfaction_surveys`    | `20260402000012_satisfaction_survey.sql`    |
| 9   | `survey_responses`        | `20260402000012_satisfaction_survey.sql`    |

## RPC Functions yang Diaudit

| Function                   | Migration File   |
| -------------------------- | ---------------- |
| `get_my_children()`        | `20260402000007` |
| `get_executive_overview()` | `20260402000007` |
| `request_parent_otp()`     | `20260402000008` |
| `verify_parent_otp()`      | `20260402000008` |
| `cleanup_expired_otps()`   | `20260402000008` |

---

## Findings

### F-01 — CRITICAL: `has_role()` 3-argument overload missing

**Severity:** CRITICAL  
**Affected Tables:** `school_baseline_metrics`, `satisfaction_surveys`, `survey_responses`  
**Issue:**  
Migrations `000011` and `000012` use `has_role(auth.uid(), get_my_tenant_id(), 'PRINCIPAL')` — a 3-argument signature `(uuid, uuid, text)`. However, the only `has_role()` function defined in `000_baseline.sql` is `has_role(app_role)` — a 1-argument signature.

This causes PostgreSQL to throw a "function does not exist" error at policy evaluation time. Since RLS defaults to DENY on error, **no user can access** `school_baseline_metrics`, `satisfaction_surveys`, or `survey_responses` — including authorized principals and admins.

**Impact:** Complete functional breakage for principal dashboard analytics and survey system.  
**Fix:** Created 3-argument overload `has_role(uuid, uuid, text)` in hardening migration.

---

### F-02 — HIGH: OTP code enumeration via SELECT

**Severity:** HIGH  
**Affected Table:** `parent_otp_codes`  
**Issue:**  
The `public_verify_otp` policy allows ANY anonymous user to SELECT all non-expired, unused OTP records:

```sql
FOR SELECT USING (expires_at > now() AND NOT used)
```

An attacker can enumerate all active OTP codes by querying the table directly, bypassing the intended OTP flow.

**Impact:** OTP codes can be harvested and used to register as any parent.  
**Fix:** Removed public SELECT policy. OTP verification is handled by `verify_parent_otp()` RPC which is `SECURITY DEFINER` and bypasses RLS. Added admin-only SELECT for audit purposes.

---

### F-03 — HIGH: OTP UPDATE allows column tampering

**Severity:** HIGH  
**Affected Table:** `parent_otp_codes`  
**Issue:**  
The `public_use_otp` UPDATE policy allows anonymous users to update ANY column on non-expired OTP records, not just the `used` flag. An attacker could:

- Change `otp_code` to a known value, then "verify" with that value
- Extend `expires_at` to prevent expiration
- Change the `phone` number to associate OTP with a different number

**Impact:** OTP bypass via code/phone/expiry tampering.  
**Fix:** Removed public UPDATE policy entirely. The `verify_parent_otp()` RPC is `SECURITY DEFINER` and performs updates server-side.

---

### F-04 — MEDIUM: `parent_teacher_threads` missing tenant isolation

**Severity:** MEDIUM  
**Affected Table:** `parent_teacher_threads`  
**Issue:**  
The `parent_own_threads` policy checks `parent_id = auth.uid() OR teacher_id = auth.uid()` without tenant_id filtering for the participant path. If a user has profiles in multiple tenants, they could access threads from another tenant.

```sql
-- BEFORE (vulnerable):
FOR ALL USING (
  parent_id = auth.uid()
  OR teacher_id = auth.uid()
  OR (tenant_id = get_my_tenant_id() AND has_role('ADMIN'))
)
```

**Impact:** Cross-tenant thread visibility in multi-tenant parent/teacher scenarios.  
**Fix:** Added `tenant_id = get_my_tenant_id()` as top-level filter for all access paths.

---

### F-05 — MEDIUM: `parent_digest_settings` missing tenant isolation

**Severity:** MEDIUM  
**Affected Table:** `parent_digest_settings`  
**Issue:**  
The `parent_own_digest_settings` policy uses only `parent_id = auth.uid()` without any tenant_id check:

```sql
FOR ALL USING (parent_id = auth.uid())
```

A parent in multiple tenants could see/modify digest settings across tenants.

**Impact:** Cross-tenant settings leakage and manipulation.  
**Fix:** Added `AND tenant_id = get_my_tenant_id()` to the policy.

---

### F-06 — MEDIUM: `survey_responses` missing respondent self-read

**Severity:** MEDIUM  
**Affected Table:** `survey_responses`  
**Issue:**  
Only principal/admin can SELECT responses. There is no policy allowing respondents to view their own submitted responses. This violates the requirement stated in the audit checklist.

**Impact:** Respondents cannot confirm their submission was recorded.  
**Fix:** Added `respondent_view_own_responses` policy for `respondent_id = auth.uid()`.

---

### F-07 — MEDIUM: `survey_responses` no unique constraint

**Severity:** MEDIUM  
**Affected Table:** `survey_responses`  
**Issue:**  
The requirement states "1 response per survey per respondent" but there is no database-level constraint enforcing this. The INSERT policy only checks `auth.uid() IS NOT NULL`, so a user could submit unlimited responses.

**Impact:** Survey result manipulation via duplicate submissions.  
**Fix:** Added unique partial index `(survey_id, respondent_id) WHERE respondent_id IS NOT NULL`.

---

### F-08 — HIGH: `get_executive_overview()` accessible by any role

**Severity:** HIGH  
**Affected Function:** `get_executive_overview()`  
**Issue:**  
The function is `SECURITY DEFINER` with `GRANT EXECUTE TO authenticated`. It only checks `auth.uid() IS NOT NULL` — no role verification. Any authenticated user (student, parent, teacher) can call this RPC and receive full executive metrics including:

- Total/active student counts
- Total/active teacher counts
- Course counts
- Average quiz scores
- Adoption rates

**Impact:** Information disclosure of sensitive institutional metrics to unauthorized roles.  
**Fix:** Added role check requiring PRINCIPAL or ADMIN.

---

## Cross-Role Attack Vector Analysis

| Attack Vector                             | Status                 | Notes                                                                                                                                       |
| ----------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Parent accessing non-child student data   | **PASS**               | `student_parent_links` correctly scoped to `parent_id = auth.uid()`. `get_my_children()` filters by `parent_id = auth.uid()` AND tenant_id. |
| Parent messaging teacher in other tenant  | **FIXED (F-04)**       | Was missing tenant_id check on participant access. Fixed.                                                                                   |
| Principal writing academic data           | **PASS**               | No WRITE policies on `assignments`, `quiz_attempts`, `grades` etc. include PRINCIPAL role. Principal is read-only on academic tables.       |
| Student accessing parent/principal routes | **PASS**               | RLS policies on parent/principal tables check specific roles. Students have no matching policies.                                           |
| Teacher cross-tenant parent messages      | **FIXED (F-04)**       | Was missing tenant_id check. Fixed.                                                                                                         |
| OTP enumeration                           | **FIXED (F-02, F-03)** | Removed public SELECT and UPDATE. Rate limiting at RPC + policy level.                                                                      |

---

## Tables Without Issues

| Table                     | Assessment                                                                                      |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `student_parent_links`    | **PASS** — SELECT restricted to own parent_id, ALL restricted to admin with tenant_id.          |
| `principal_settings`      | **PASS** — FOR ALL with tenant_id + PRINCIPAL/ADMIN role check. Correct 1-arg has_role() usage. |
| `parent_teacher_messages` | **PASS** — Checks thread membership via subquery with tenant_id.                                |

---

## Recommendations

1. **Production OTP delivery:** Remove `dev_otp` field from `request_parent_otp()` response before production deployment. The OTP code should only be delivered via WhatsApp/SMS, never in API responses.

2. **OTP hashing:** Consider storing OTP codes as bcrypt/sha256 hashes instead of plaintext. The `verify_parent_otp()` function would hash the input before comparison.

3. **Rate limiting on `get_executive_overview()`:** While now role-restricted, consider adding a rate limit (e.g., 10 calls/minute) to prevent metric scraping.

4. **Audit logging:** Add `admin_audit_logs` entries for sensitive operations:
   - Parent-student link creation/deletion
   - Principal settings changes
   - Survey creation/closure

5. **`get_my_children()` role check:** The RPC is granted to all `authenticated` users but only makes sense for parents. Consider adding `has_role('PARENT')` check for defense in depth.

6. **Realtime subscription security:** Ensure Supabase Realtime for `parent_teacher_messages` respects RLS. Verify that Realtime is configured with RLS enforcement enabled (not bypassed).

---

## Fix Applied

Migration: `supabase/migrations/20260402200000_security_hardening_phase30.sql`

| Fix                          | Finding | Description                                                  |
| ---------------------------- | ------- | ------------------------------------------------------------ |
| 3-arg `has_role()` overload  | F-01    | Unblocks principal/admin access to baseline_metrics, surveys |
| Remove OTP public SELECT     | F-02    | Prevents OTP code enumeration                                |
| Remove OTP public UPDATE     | F-03    | Prevents OTP column tampering                                |
| Threads tenant isolation     | F-04    | Adds `tenant_id = get_my_tenant_id()` to participant check   |
| Digest tenant isolation      | F-05    | Adds `tenant_id = get_my_tenant_id()` to parent check        |
| Respondent self-read         | F-06    | Allows respondents to view own survey responses              |
| Unique response constraint   | F-07    | Enforces 1 response per survey per respondent                |
| Executive overview role gate | F-08    | Restricts to PRINCIPAL/ADMIN only                            |
| OTP rate limit at policy     | —       | Defense-in-depth rate limiting on INSERT                     |

---

## Status: FAIL → FIXED

**8 vulnerabilities found.** All addressed in hardening migration `20260402200000`.

- 1 CRITICAL (broken function signature)
- 3 HIGH (OTP enumeration, OTP tampering, executive data leak)
- 4 MEDIUM (tenant isolation gaps, missing policies/constraints)
