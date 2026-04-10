# Auth Parity Test Plan — Phase 0B Gate

**Status:** DRAFT  
**Phase:** Phase 0B Auth Abstraction  
**Date:** 2026-04-10  
**Purpose:** Ensure auth behavior is identical before and after abstraction

---

## Scope

This test plan covers Phase 0B auth abstraction migration only.  
After Phase 0B, `supabase.auth.*` calls are replaced with `getAuthProvider().*` but behavior must remain identical.

**Out of scope:**
- VIL auth implementation (Phase 1+)
- Edge function auth handlers
- Realtime auth events (Phase 0C)
- Storage auth (Phase 0D)

---

## Critical Invariants (Must Not Change)

### Session Lifecycle
- [ ] Session stored in localStorage with same keys
- [ ] Session refresh interval = 60,000ms (1 minute)
- [ ] Refresh triggered when `expires_at - now < 5 minutes`
- [ ] Session cleanup on signOut clears all auth-related localStorage

### Auth State Changes
- [ ] `onAuthStateChange` fires on: sign in, sign out, token refresh
- [ ] Callback receives correct event string (`SIGNED_IN`, `SIGNED_OUT`, `TOKEN_REFRESHED`)
- [ ] All active auth state listeners notified simultaneously

### Redirect Behavior
- [ ] Post-signin redirect: preserved `redirectTo` or default to `/app`
- [ ] OAuth callback: `?code=` exchange works identically
- [ ] Session expiry redirect: `/login?expired=true`

### Error Handling
- [ ] Invalid credentials: `{ message: "Invalid login credentials" }`
- [ ] Network error: `{ message: "Network error" }` with retry logic
- [ ] Rate limit: proper backoff behavior unchanged

### MFA Flow
- [ ] QRCode generated client-side (browser)
- [ ] TOTP verification happens on provider
- [ ] Factor list returns correct structure
- [ ] Unenroll removes factor from both local and provider

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Teacher | teacher@edusync.dev | (use dev password) |
| Student | student@edusync.dev | (use dev password) |
| Admin | admin@edusync.dev | (use dev password) |

---

## Test Cases

### TC-01: Sign In with Password

**Precondition:** User logged out

**Steps:**
1. Navigate to `/login`
2. Enter valid credentials
3. Click "Masuk"
4. Observe redirect to `/app`

**Expected:**
- [ ] Auth state `SIGNED_IN` fired
- [ ] Session stored in localStorage
- [ ] User object contains `id`, `email`, `role`
- [ ] Redirect to `/app` (or preserved `redirectTo`)

**Parity Check:** Same behavior with Supabase direct vs adapter

---

### TC-02: Sign Out

**Precondition:** User logged in

**Steps:**
1. Click user menu → "Keluar"
2. Observe redirect

**Expected:**
- [ ] Auth state `SIGNED_OUT` fired
- [ ] Session removed from localStorage
- [ ] User cleared from AuthContext
- [ ] Redirect to `/login`

**Parity Check:** localStorage keys same as before abstraction

---

### TC-03: Session Persistence (Page Reload)

**Precondition:** User logged in

**Steps:**
1. Log in
2. Reload page (F5)
3. Check if still authenticated

**Expected:**
- [ ] Session restored from localStorage
- [ ] AuthContext populated
- [ ] No redirect to login

---

### TC-04: Automatic Session Refresh

**Precondition:** User logged in with session near expiry

**Steps:**
1. Log in
2. Wait ~55 minutes (or mock time)
3. Observe network request

**Expected:**
- [ ] `refreshSession()` called automatically
- [ ] New access_token received
- [ ] No user interaction required

---

### TC-05: MFA Enrollment

**Precondition:** User logged in, MFA not enabled

**Steps:**
1. Navigate to security settings
2. Click "Aktifkan MFA"
3. Scan QRCode with authenticator app
4. Enter TOTP code
5. Save backup codes

**Expected:**
- [ ] QRCode rendered in browser
- [ ] TOTP verification successful
- [ ] Factor listed in MFA factors
- [ ] Subsequent logins require TOTP

---

### TC-06: MFA Login Flow

**Precondition:** User has MFA enabled

**Steps:**
1. Enter credentials on login page
2. Enter TOTP code on MFA challenge page
3. Complete login

**Expected:**
- [ ] MFA challenge page shown
- [ ] TOTP verification succeeds
- [ ] Full session granted

---

### TC-07: Invalid Credentials Rejection

**Precondition:** None

**Steps:**
1. Enter invalid email/password
2. Click "Masuk"

**Expected:**
- [ ] Error message displayed: "Email atau kata sandi salah"
- [ ] No redirect
- [ ] No session created

---

### TC-08: OAuth Sign In (Google)

**Precondition:** OAuth provider configured

**Steps:**
1. Click "Masuk dengan Google"
2. Complete OAuth flow in popup
3. Return to app

**Expected:**
- [ ] Popup opens OAuth consent
- [ ] Callback handled correctly
- [ ] Session created
- [ ] Redirect to `/app`

---

### TC-09: Role Resolution

**Precondition:** User logged in with known role

**Steps:**
1. Log in as teacher
2. Check AuthContext for `role`
3. Log in as student
4. Check AuthContext for `role`

**Expected:**
- [ ] Teacher: `role` includes "teacher"
- [ ] Student: `role` includes "student"
- [ ] `hasRole('admin')` returns correct boolean

---

### TC-10: Multi-Tenant Role Resolution

**Precondition:** User belongs to multiple tenants with different roles

**Steps:**
1. Log in with multi-tenant account
2. Switch workspace
3. Check if role updates correctly

**Expected:**
- [ ] Role reflects current tenant context
- [ ] Permissions update on workspace switch
- [ ] No stale role data

---

## Test Execution

### Before Phase 0B (Baseline)
```bash
# Create test account snapshots
# Run manual tests TC-01 through TC-10
# Document any pre-existing issues
```

### After Phase 0B (Verification)
```bash
# Re-run same tests
# Compare behavior - must be identical
# Verify grep results:
grep -rn "from '@supabase/supabase-js'" src/features/auth/ src/contexts/auth/ src/contexts/AuthContext.tsx
grep -rn "from '@/services/supabase/client'" src/features/auth/ src/contexts/auth/ src/contexts/AuthContext.tsx
```

**Expected after Phase 0B:**
- Direct SDK imports = 0
- Direct supabase client imports = 0
- All TC results match baseline

---

## Sign-off

| Checkpoint | Status | Date | Tester |
|------------|--------|------|--------|
| Baseline recorded | [ ] | | |
| TC-01 Sign In | [ ] | | |
| TC-02 Sign Out | [ ] | | |
| TC-03 Session Persistence | [ ] | | |
| TC-04 Session Refresh | [ ] | | |
| TC-05 MFA Enroll | [ ] | | |
| TC-06 MFA Login | [ ] | | |
| TC-07 Invalid Credentials | [ ] | | |
| TC-08 OAuth | [ ] | | |
| TC-09 Role Resolution | [ ] | | |
| TC-10 Multi-Tenant Roles | [ ] | | |
| **Gate 0B PASS** | [ ] | | |

---

## Notes

- MFA tests require authenticator app setup
- OAuth tests require OAuth provider configuration
- Some tests may require test environment with real Supabase instance
- VIL stub provider will return `NOT_IMPLEMENTED` - tests should verify this error is caught gracefully

---

## References

- TASK_QUEUE_0B_0D.md (Wave 0B entry conditions)
- Auth Parity Plan - Phase 0B Gate (this document)
