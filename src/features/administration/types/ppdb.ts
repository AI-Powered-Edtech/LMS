/**
 * ppdb.ts — Tipe data untuk modul PPDB Online.
 *
 * Mencakup:
 *  - PPDBPeriod            : periode pendaftaran (gelombang)
 *  - PPDBRegistration      : data pendaftar individu
 *  - PPDBSummary           : ringkasan statistik pendaftar
 *  - PPDBRegistrationFilter: filter tabel pendaftar
 */

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

export type PPDBPeriodStatus = "draft" | "open" | "closed" | "announced";

export type PPDBRegistrationStatus =
  | "pending"
  | "reviewed"
  | "accepted"
  | "rejected"
  | "waitlisted";

export type PPDBGender = "L" | "P";

// ---------------------------------------------------------------------------
// Periode PPDB
// ---------------------------------------------------------------------------

export interface PPDBPeriod {
  id: string;
  tenant_id: string;
  academic_year: string; // '2026/2027'
  name: string; // 'Gelombang 1'
  start_date: string; // ISO date
  end_date: string; // ISO date
  quota: number;
  status: PPDBPeriodStatus;
  created_at: string;
}

export interface PPDBPeriodInput {
  academic_year: string;
  name: string;
  start_date: string;
  end_date: string;
  quota: number;
}

// ---------------------------------------------------------------------------
// Pendaftar
// ---------------------------------------------------------------------------

export interface PPDBRegistration {
  id: string;
  tenant_id: string;
  period_id: string;
  registration_number: string; // PPDB-2026-0001
  student_name: string;
  birth_date: string;
  gender: PPDBGender;
  previous_school: string | null;
  parent_name: string;
  parent_phone: string;
  parent_email: string | null;
  address: string | null;
  documents: Record<string, string>; // { ijazah: url, akte: url }
  status: PPDBRegistrationStatus;
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Ringkasan statistik
// ---------------------------------------------------------------------------

export interface PPDBSummary {
  total: number;
  quota: number;
  accepted: number;
  rejected: number;
  pending: number;
  reviewed: number;
  waitlisted: number;
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------

export type PPDBStatusFilter = "all" | PPDBRegistrationStatus;

export interface PPDBRegistrationFilter {
  status: PPDBStatusFilter;
  search: string;
  page: number;
  pageSize: number;
}
