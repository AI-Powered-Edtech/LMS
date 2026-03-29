# EduSync LMS — SCORM Integration Guide

EduSync mendukung SCORM 1.2 dan SCORM 2004 content packages yang di-embed dalam pelajaran.

## Architecture

    SCORM Package uploaded → scorm_packages table
        → Lesson type set to 'scorm'
        → Student opens lesson → SCORM iframe renders
        → SCORM API bridge on parent window (bukan iframe)
        → CMI data saved via upsert_scorm_runtime() RPC
        → lesson_progress synced automatically

## SCORM API Bridge

Bridge API SCORM di-expose di **parent `window`** (bukan di dalam iframe):

- SCORM 1.2: `API` object pada `window`
- SCORM 2004: `API_1484_11` object pada `window`

**Penting:** Jangan pasang bridge di dalam iframe — platform eksternal tidak akan bisa menemukannya.

## `lesson_status` — Sticky Terminal States

Terminal states (`passed`, `completed`) **tidak pernah di-override** oleh status berikutnya:

| Current Status      | Incoming Status | Result                                  |
| ------------------- | --------------- | --------------------------------------- |
| `passed`            | `failed`        | `passed` — sticky, tidak di-override    |
| `completed`         | `incomplete`    | `completed` — sticky, tidak di-override |
| Non-terminal apapun | Apapun          | Di-update normal                        |

Logika ini diimplementasi di RPC `upsert_scorm_runtime()`.

## Database Tables

| Table                | Purpose                                                      |
| -------------------- | ------------------------------------------------------------ |
| `scorm_packages`     | Registry paket yang di-upload, linked ke lessons             |
| `scorm_runtime_data` | Per-user CMI state: scores, status, suspend_data, total_time |

## Key RPC

`upsert_scorm_runtime(p_user_id, p_scorm_package_id, p_tenant_id, p_cmi_data, ...)`:

- Atomic save CMI state
- Enforce sticky terminal state logic
- Sync `lesson_progress` untuk course progress tracking

## Supported CMI Fields

| Field        | SCORM 1.2                  | SCORM 2004                                     |
| ------------ | -------------------------- | ---------------------------------------------- |
| Score        | `cmi.core.score.raw`       | `cmi.score.raw`                                |
| Status       | `cmi.core.lesson_status`   | `cmi.completion_status` + `cmi.success_status` |
| Location     | `cmi.core.lesson_location` | `cmi.location`                                 |
| Suspend data | `cmi.suspend_data`         | `cmi.suspend_data`                             |
| Total time   | `cmi.core.total_time`      | `cmi.total_time`                               |

## Migration Reference

| Migration        | Description                                        |
| ---------------- | -------------------------------------------------- |
| `20260324200000` | SCORM schema: packages, runtime data, RLS policies |
