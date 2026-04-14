# Remove Git Index Lock Spec

## Why

Terjadi kegagalan saat menjalankan proses Git (seperti commit atau push) karena adanya file `.git/index.lock` yang tertinggal. Hal ini umumnya disebabkan oleh proses Git yang masih berjalan di latar belakang, atau proses Git sebelumnya yang mengalami crash, sehingga menghalangi operasi Git selanjutnya.

## What Changes

- Menghapus file `/workspace/.git/index.lock` secara manual.

## Impact

- Affected specs: -
- Affected code: Lingkungan Git repositori (direktori `.git/`).

## ADDED Requirements

### Requirement: New Feature

Sistem HARUS membersihkan sisa-sisa proses Git yang bermasalah.

#### Scenario: Success case

- **WHEN** user mencoba melakukan aksi Git setelah lock dihapus
- **THEN** proses Git akan berjalan normal tanpa error "index.lock File exists".
