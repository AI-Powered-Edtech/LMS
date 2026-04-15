# Schema Audit — Phase 2 Batch 1

Audit date: 2026-04-11
Target DB: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

## `public.courses`

| Column         | Type            | Nullable |
| -------------- | --------------- | -------- |
| `id`           | `uuid`          | no       |
| `title`        | `text`          | no       |
| `description`  | `text`          | yes      |
| `subject`      | `text`          | yes      |
| `level`        | `text`          | yes      |
| `created_by`   | `uuid`          | no       |
| `created_at`   | `timestamptz`   | no       |
| `updated_at`   | `timestamptz`   | no       |
| `tenant_id`    | `uuid`          | no       |
| `status`       | `course_status` | no       |
| `published_at` | `timestamptz`   | yes      |

## `public.course_modules`

| Column       | Type          | Nullable |
| ------------ | ------------- | -------- |
| `id`         | `uuid`        | no       |
| `course_id`  | `uuid`        | no       |
| `title`      | `text`        | no       |
| `order`      | `int4`        | no       |
| `created_at` | `timestamptz` | no       |
| `updated_at` | `timestamptz` | no       |
| `tenant_id`  | `uuid`        | no       |

## `public.lessons`

| Column             | Type          | Nullable |
| ------------------ | ------------- | -------- |
| `id`               | `uuid`        | no       |
| `module_id`        | `uuid`        | no       |
| `title`            | `text`        | no       |
| `content`          | `text`        | yes      |
| `order`            | `int4`        | no       |
| `created_at`       | `timestamptz` | no       |
| `updated_at`       | `timestamptz` | no       |
| `tenant_id`        | `uuid`        | no       |
| `type`             | `text`        | yes      |
| `passing_score`    | `int4`        | yes      |
| `is_published`     | `bool`        | yes      |
| `duration_minutes` | `int4`        | yes      |

## `public.classes`

| Column         | Type          | Nullable |
| -------------- | ------------- | -------- |
| `id`           | `uuid`        | no       |
| `name`         | `text`        | no       |
| `course_id`    | `uuid`        | yes      |
| `teacher_id`   | `uuid`        | no       |
| `join_code`    | `text`        | no       |
| `max_students` | `int4`        | yes      |
| `created_at`   | `timestamptz` | no       |
| `updated_at`   | `timestamptz` | no       |
| `tenant_id`    | `uuid`        | no       |

## `public.enrollments`

| Column       | Type                | Nullable |
| ------------ | ------------------- | -------- |
| `id`         | `uuid`              | no       |
| `class_id`   | `uuid`              | no       |
| `student_id` | `uuid`              | no       |
| `status`     | `enrollment_status` | no       |
| `joined_at`  | `timestamptz`       | no       |
| `tenant_id`  | `uuid`              | no       |

## Notes

- `course_modules."order"` dan `lessons."order"` harus selalu di-quote di SQL.
- `enrollments` lokal masih memakai `student_id`, bukan `user_id`.
- `lessons.content` masih bertipe `text`; block-content JSON perlu serialisasi eksplisit jika dipindahkan penuh ke VIL.
