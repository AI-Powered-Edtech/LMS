# Schema Audit — Phase 1B

- Audit date: 2026-04-10
- Local DB target: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- Remote bootstrap source: `https://omfnkoufjqjqilswldtz.supabase.co`
- Bootstrap sample user: `teacher@edusync.dev`

## Summary

- `public.users` does not exist in the local DB.
- `auth.users` is accessible in the local DB, but the three shared dev accounts are not present there.
- `public.get_auth_bootstrap()` is not present in the local DB.
- A real `get_auth_bootstrap` sample was captured successfully from the remote Supabase dev project.
- `requires_email_verification` is present in the remote bootstrap response.

## Table Existence

| Table                | Exists in local DB |
| -------------------- | ------------------ |
| `classes`            | yes                |
| `enrollments`        | yes                |
| `invitations`        | no                 |
| `profiles`           | yes                |
| `tenant_memberships` | no                 |
| `tenants`            | yes                |
| `user_roles`         | yes                |

## Column Audit

### `public.classes`

| Column         | Type                       | Nullable | Default             |
| -------------- | -------------------------- | -------- | ------------------- |
| `id`           | `uuid`                     | no       | `gen_random_uuid()` |
| `name`         | `text`                     | no       | none                |
| `course_id`    | `uuid`                     | yes      | none                |
| `teacher_id`   | `uuid`                     | no       | none                |
| `join_code`    | `text`                     | no       | none                |
| `max_students` | `integer`                  | yes      | none                |
| `created_at`   | `timestamp with time zone` | no       | `now()`             |
| `updated_at`   | `timestamp with time zone` | no       | `now()`             |
| `tenant_id`    | `uuid`                     | no       | none                |

### `public.enrollments`

| Column       | Type                       | Nullable | Default                       |
| ------------ | -------------------------- | -------- | ----------------------------- |
| `id`         | `uuid`                     | no       | `gen_random_uuid()`           |
| `class_id`   | `uuid`                     | no       | none                          |
| `student_id` | `uuid`                     | no       | none                          |
| `status`     | `USER-DEFINED`             | no       | `'ACTIVE'::enrollment_status` |
| `joined_at`  | `timestamp with time zone` | no       | `now()`                       |
| `tenant_id`  | `uuid`                     | no       | none                          |

Note: local schema still uses `student_id`, not `user_id`.

### `public.profiles`

| Column              | Type                       | Nullable | Default    |
| ------------------- | -------------------------- | -------- | ---------- |
| `id`                | `uuid`                     | no       | none       |
| `email`             | `text`                     | no       | none       |
| `first_name`        | `text`                     | no       | `''::text` |
| `last_name`         | `text`                     | no       | `''::text` |
| `avatar_url`        | `text`                     | yes      | none       |
| `phone`             | `text`                     | yes      | none       |
| `is_active`         | `boolean`                  | no       | `true`     |
| `created_at`        | `timestamp with time zone` | no       | `now()`    |
| `updated_at`        | `timestamp with time zone` | no       | `now()`    |
| `tenant_id`         | `uuid`                     | yes      | none       |
| `full_name`         | `text`                     | yes      | none       |
| `level`             | `integer`                  | yes      | `1`        |
| `is_demo`           | `boolean`                  | yes      | `false`    |
| `username`          | `text`                     | yes      | none       |
| `bio`               | `text`                     | yes      | `''::text` |
| `is_profile_public` | `boolean`                  | yes      | `false`    |

### `public.tenants`

| Column       | Type                       | Nullable | Default             |
| ------------ | -------------------------- | -------- | ------------------- |
| `id`         | `uuid`                     | no       | `gen_random_uuid()` |
| `name`       | `text`                     | no       | none                |
| `slug`       | `text`                     | no       | none                |
| `is_active`  | `boolean`                  | no       | `true`              |
| `created_at` | `timestamp with time zone` | no       | `now()`             |
| `updated_at` | `timestamp with time zone` | no       | `now()`             |

### `public.user_roles`

| Column       | Type                       | Nullable | Default             |
| ------------ | -------------------------- | -------- | ------------------- |
| `id`         | `uuid`                     | no       | `gen_random_uuid()` |
| `user_id`    | `uuid`                     | no       | none                |
| `role`       | `USER-DEFINED`             | no       | none                |
| `created_at` | `timestamp with time zone` | no       | `now()`             |
| `tenant_id`  | `uuid`                     | no       | none                |

### `public.invitations`

Table not present in the local DB.

### `public.tenant_memberships`

Table not present in the local DB.

## `public.users`

- Exists in local DB: no

## `auth.users`

- Accessible in local DB: yes
- Shared dev accounts present locally: no rows returned for:
  - `teacher@edusync.dev`
  - `student@edusync.dev`
  - `admin@edusync.dev`

## Password Hash Format

- Local `auth.users` access works, but no local rows exist for the three shared dev accounts.
- Result: hash prefix for those accounts could not be captured from the local DB.
- Remote sign-in for all three accounts succeeds, so those accounts exist in the remote Supabase project.

## `get_auth_bootstrap`

- Function exists in local DB: no
- Remote capture succeeded: yes
- Captured sample saved at [bootstrap-sample.json](/home/rog/Documents/edusync1/LMS/edusync-api/docs/bootstrap-sample.json)

Exact captured JSON:

```json
{
  "profile": {
    "id": "ecdfd0b7-0cd7-49ec-bf5f-0c81d66c6185",
    "email": "teacher@edusync.dev",
    "last_name": "Dev",
    "tenant_id": "00000000-0000-0000-0000-00000000000d",
    "avatar_url": null,
    "first_name": "Teacher"
  },
  "memberships": [
    {
      "role": "teacher",
      "status": "active",
      "is_active": true,
      "joined_at": "2026-03-17T11:58:05.88057+00:00",
      "tenant_id": "00000000-0000-0000-0000-00000000000d",
      "tenant_logo": null,
      "tenant_name": "EduSync Dev Tenant",
      "tenant_slug": "dev"
    }
  ],
  "default_tenant_id": "00000000-0000-0000-0000-00000000000d",
  "requires_email_verification": false
}
```

## Blockers

- The local DB is not yet a faithful auth target for Phase 1B:
  - `public.users` is missing
  - `public.get_auth_bootstrap()` is missing
  - `invitations` and `tenant_memberships` are missing
  - shared dev accounts are not present in local `auth.users`
- Because of that, backend implementation can proceed in code, but runtime verification against the local DB will stay incomplete until the target DB is aligned or a real `DATABASE_URL` is provided for the intended environment.
