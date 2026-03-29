# EduSync LMS — Multi-Tenant Security Audit Report

> **Date**: 2026-03-08  
> **Scope**: All 31 public tables, 119 RLS policies, 10 helper functions  
> **Supabase Project**: `` (LMS)

---

## Executive Summary

| Metric                         | Value                                                                    |
| ------------------------------ | ------------------------------------------------------------------------ |
| Tables scanned                 | 31                                                                       |
| RLS policies scanned           | 119                                                                      |
| Helper functions scanned       | 10                                                                       |
| Tables with `tenant_id`        | 26                                                                       |
| Global tables (no `tenant_id`) | 5 (`tenants`, `badges`, `user_badges`, `user_points`, `recommendations`) |
| **Vulnerabilities found**      | **5**                                                                    |
| Severity: CRITICAL             | 2                                                                        |
| Severity: MEDIUM               | 2                                                                        |
| Severity: LOW                  | 1                                                                        |

---

## Validation Results

### ✅ PASS: All SELECT policies enforce tenant isolation

All 26 tenant-scoped tables have `tenant_id = get_my_tenant_id()` as the first condition in every SELECT policy. No SELECT policy allows cross-tenant reads.

| Category             | Tables | Result                                            |
| -------------------- | ------ | ------------------------------------------------- |
| Tenant-scoped tables | 26     | ✅ All enforce `tenant_id = get_my_tenant_id()`   |
| Global tables        | 5      | ✅ Correctly scoped by `auth.uid()` or admin-only |

### ✅ PASS: All UPDATE/DELETE policies enforce tenant isolation

Every UPDATE and DELETE policy on tenant-scoped tables includes `tenant_id = get_my_tenant_id()` as a required condition. No cross-tenant mutation is possible.

### ✅ PASS: INSERT policies check tenant_id (with exceptions)

25 of 26 tenant-scoped tables enforce `tenant_id = get_my_tenant_id()` in their INSERT `WITH CHECK`.

**Exception**: `profiles_insert` — see [VULN-001](#vuln-001-profiles_insert-missing-tenant_id-check).

### ✅ PASS: Helper functions enforce tenant context

| Function              | Uses `auth.uid()` | Uses tenant check                  | `SECURITY DEFINER` | `search_path = ''` |
| --------------------- | ----------------- | ---------------------------------- | ------------------ | ------------------ |
| `get_my_tenant_id()`  | ✅                | ✅ (returns it)                    | ✅                 | ✅                 |
| `has_role()`          | ✅                | ✅ `tenant_id = profile.tenant_id` | ✅                 | ✅                 |
| `is_class_member()`   | ✅                | ✅ `tenant_id = profile.tenant_id` | ✅                 | ✅                 |
| `is_class_teacher()`  | ✅                | ✅ `tenant_id = profile.tenant_id` | ✅                 | ✅                 |
| `is_course_creator()` | ✅                | ✅ `tenant_id = profile.tenant_id` | ✅                 | ✅                 |

> All helper functions are `SECURITY DEFINER` with `search_path = ''`, preventing search path injection. All derive tenant context from `auth.uid()` — no user-supplied tenant parameter.

---

## Vulnerabilities Found

### VULN-001: `profiles_insert` missing tenant_id check

|               |                   |
| ------------- | ----------------- |
| **Severity**  | 🔴 CRITICAL       |
| **Table**     | `profiles`        |
| **Policy**    | `profiles_insert` |
| **Operation** | INSERT            |

**Current policy**:
