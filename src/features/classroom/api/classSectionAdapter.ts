/**
 * Class-section adapter — Workstream B2.
 *
 * Unified call site for class-section operations preferring `rombel` (the new
 * authoritative class-section entity per ADR-002) and falling back to
 * `classes` rows that have no rombel_id mapping yet (legacy course-instances
 * created before migration 069).
 *
 * Feature flag: VITE_USE_ROMBEL_ADAPTER (default: true). Set to "false" to
 * disable rombel-preference for the rollout safety period.
 */

import { db } from "@/services/db";
import { logger } from "@/utils/logger";

export interface ClassSection {
  id: string;
  /** Source table this row came from. Useful for telemetry / progressive cutover. */
  source: "rombel" | "classes";
  name: string;
  code: string | null;
  wali_kelas_id: string | null;
  student_count: number | null;
}

export interface ClassSectionStudent {
  student_id: string;
  full_name: string;
  email: string | null;
}

/**
 * Whether the rombel-preference adapter is enabled. Reads VITE_USE_ROMBEL_ADAPTER
 * lazily so tests can stub it. Defaults to true.
 */
export function isRombelAdapterEnabled(): boolean {
  const env = (import.meta as { env?: Record<string, unknown> }).env ?? {};
  const raw = (env.VITE_USE_ROMBEL_ADAPTER as string | undefined) ?? "true";
  return raw !== "false" && raw !== "0";
}

/**
 * Returns class-sections visible to the current user via RLS. Order:
 *   1. Rombel rows (authoritative)
 *   2. Classes rows whose `rombel_id IS NULL` (legacy / unmapped)
 *
 * If the flag is disabled, returns only the legacy classes path.
 *
 * Calls remain best-effort: if either fetch fails the helper logs and returns
 * the rows it has so the page can still render partial data.
 */
export async function listClassSections(): Promise<ClassSection[]> {
  if (!isRombelAdapterEnabled()) {
    return listClassSectionsLegacy();
  }

  const out: ClassSection[] = [];

  try {
    const { data, error } = await db
      .from("rombel")
      .select("id, name, code, wali_kelas_id, status")
      .eq("status", "active")
      .order("code", { ascending: true });

    if (error) throw error;
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      out.push({
        id: row.id as string,
        source: "rombel",
        name: (row.name as string) ?? "",
        code: (row.code as string | null) ?? null,
        wali_kelas_id: (row.wali_kelas_id as string | null) ?? null,
        student_count: null,
      });
    }
  } catch (err) {
    logger.warn("[ClassSectionAdapter] rombel fetch failed; falling back", err);
  }

  try {
    const { data, error } = await db
      .from("classes")
      .select("id, name, teacher_id, rombel_id")
      .is("rombel_id", null)
      .order("name", { ascending: true });

    if (error) throw error;
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      out.push({
        id: row.id as string,
        source: "classes",
        name: (row.name as string) ?? "",
        code: null,
        wali_kelas_id: (row.teacher_id as string | null) ?? null,
        student_count: null,
      });
    }
  } catch (err) {
    logger.warn("[ClassSectionAdapter] classes fallback failed", err);
  }

  return out;
}

async function listClassSectionsLegacy(): Promise<ClassSection[]> {
  try {
    const { data, error } = await db
      .from("classes")
      .select("id, name, teacher_id")
      .order("name", { ascending: true });
    if (error) throw error;
    return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
      id: row.id as string,
      source: "classes" as const,
      name: (row.name as string) ?? "",
      code: null,
      wali_kelas_id: (row.teacher_id as string | null) ?? null,
      student_count: null,
    }));
  } catch (err) {
    logger.warn("[ClassSectionAdapter:legacy] classes fetch failed", err);
    return [];
  }
}

/**
 * Fetch student list for a class-section, dispatching by source table:
 *   - source='rombel'  → reads rombel_members + profiles
 *   - source='classes' → reads enrollments + profiles (legacy path)
 *
 * Returns an alphabetically-sorted list of students. Throws on DB error so the
 * caller can show an explicit error state (unlike listClassSections which is
 * best-effort).
 */
export async function getClassSectionStudents(
  section: Pick<ClassSection, "id" | "source">,
  tenantId?: string,
): Promise<ClassSectionStudent[]> {
  const memberIds: string[] = [];

  if (section.source === "rombel") {
    const { data, error } = await db
      .from("rombel_members")
      .select("student_id, left_at")
      .eq("rombel_id", section.id)
      .is("left_at", null);
    if (error) throw error;
    for (const r of (data ?? []) as Array<{ student_id: string }>) {
      if (r.student_id) memberIds.push(r.student_id);
    }
  } else {
    let q = db
      .from("enrollments")
      .select("student_id")
      .eq("class_id", section.id)
      .eq("status", "ACTIVE");
    if (tenantId) {
      // Defense-in-depth tenant scoping when caller provides tenantId
      // (preserves attendanceService.fetchClassStudents original guarantee).
      q = q.eq("tenant_id", tenantId);
    }
    const { data, error } = await q;
    if (error) throw error;
    for (const r of (data ?? []) as Array<{ student_id: string }>) {
      if (r.student_id) memberIds.push(r.student_id);
    }
  }

  if (memberIds.length === 0) return [];

  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, full_name, email")
    .in("id", memberIds);
  if (error) throw error;

  const out: ClassSectionStudent[] = (
    (profiles ?? []) as Array<{
      id: string;
      full_name: string | null;
      email: string | null;
    }>
  ).map((p) => ({
    student_id: p.id,
    full_name: p.full_name ?? "Siswa",
    email: p.email,
  }));

  out.sort((a, b) => a.full_name.localeCompare(b.full_name));
  return out;
}

/**
 * Dual-source dispatch by raw entity id (Issue #325 F2).
 *
 * The caller does not always know whether `entityId` is a `rombel.id` or a
 * legacy `classes.id`. This helper looks the id up in `rombel` first; if a
 * row matches, it dispatches with `source='rombel'`. Otherwise it falls back
 * to the legacy `source='classes'` path.
 *
 * Use this when migrating call sites that previously queried `enrollments`
 * directly (e.g. attendanceService.fetchClassStudents) so the cutover stays
 * consistent with the rombel rollout.
 *
 * Tenant scoping is enforced explicitly on the lookup and on the enrollments
 * fallback for defense-in-depth (RLS is still the primary guard).
 *
 * Falls back silently to `source='classes'` on lookup error so the caller
 * never breaks on transient failures.
 */
export async function getClassSectionStudentsByEntityId(
  entityId: string,
  tenantId: string,
): Promise<ClassSectionStudent[]> {
  let source: "rombel" | "classes" = "classes";

  if (isRombelAdapterEnabled()) {
    try {
      const { data, error } = await db
        .from("rombel")
        .select("id")
        .eq("id", entityId)
        .eq("tenant_id", tenantId)
        .limit(1);
      if (!error && Array.isArray(data) && data.length > 0) {
        source = "rombel";
      }
    } catch (err) {
      logger.warn(
        "[ClassSectionAdapter] rombel lookup failed; defaulting to classes source",
        err,
      );
    }
  }

  return getClassSectionStudents({ id: entityId, source }, tenantId);
}

/**
 * Compile-time exhaustiveness check for `ClassSection['source']` consumers.
 * Pass the value at the end of a switch/if-else chain; if a new source variant is
 * added in the future, TypeScript will reject the call site until it handles it.
 *
 * @example
 * switch (section.source) {
 *   case 'rombel': return doRombel(section);
 *   case 'classes': return doClasses(section);
 *   default: assertSourceExhaustive(section.source);
 * }
 */
export function assertSourceExhaustive(value: never): never {
  throw new Error(`Unhandled ClassSection.source variant: ${String(value)}`);
}

// ---------------------------------------------------------------------------
// Student-side helpers (Issue #325 F2 closure)
// ---------------------------------------------------------------------------

export interface StudentClassSection {
  enrollmentId: string;
  classId: string;
  className: string;
  source: "rombel" | "classes";
}

/**
 * Class-sections a student belongs to. Dual-source dispatch:
 *   - rombel_members (active rows: left_at IS NULL) -> source="rombel"
 *   - enrollments    (status="ACTIVE")              -> source="classes"
 *
 * Both sides are queried when the rombel adapter is enabled and merged.
 * Errors on either side are logged and skipped so partial data still renders
 * (matches the listClassSections best-effort contract).
 *
 * The returned `enrollmentId` is the source-table row id (rombel_members.id
 * for "rombel", enrollments.id for "classes"). Do NOT cross-match
 * enrollmentId to attendance_records across sources -- use
 * getStudentAttendance instead, which dispatches per source.
 */
export async function getStudentClassSections(
  studentId: string,
  tenantId: string,
): Promise<StudentClassSection[]> {
  const out: StudentClassSection[] = [];

  if (isRombelAdapterEnabled()) {
    try {
      const { data: members, error } = await db
        .from("rombel_members")
        .select("id, rombel_id")
        .eq("student_id", studentId)
        .eq("tenant_id", tenantId)
        .is("left_at", null);
      if (error) throw error;
      const rows = (members ?? []) as Array<{ id: string; rombel_id: string }>;
      const rombelIds = Array.from(
        new Set(rows.map((r) => r.rombel_id).filter(Boolean)),
      );
      if (rombelIds.length > 0) {
        const { data: rombelRows, error: rombelErr } = await db
          .from("rombel")
          .select("id, name, code")
          .eq("tenant_id", tenantId)
          .in("id", rombelIds);
        if (rombelErr) throw rombelErr;
        const nameById = new Map<string, string>();
        for (const r of (rombelRows ?? []) as Array<{
          id: string;
          name: string | null;
          code: string | null;
        }>) {
          nameById.set(r.id, r.name || r.code || "Rombel");
        }
        for (const r of rows) {
          out.push({
            enrollmentId: r.id,
            classId: r.rombel_id,
            className: nameById.get(r.rombel_id) ?? "Rombel",
            source: "rombel",
          });
        }
      }
    } catch (err) {
      logger.warn(
        "[ClassSectionAdapter] rombel student-sections fetch failed; falling back to enrollments",
        err,
      );
    }
  }

  try {
    const { data: enrollmentsRaw, error } = await db
      .from("enrollments")
      .select("id, class_id")
      .eq("student_id", studentId)
      .eq("tenant_id", tenantId)
      .eq("status", "ACTIVE");
    if (error) throw error;
    const rows = (enrollmentsRaw ?? []) as Array<{
      id: string;
      class_id: string;
    }>;
    const classIds = Array.from(
      new Set(rows.map((r) => r.class_id).filter(Boolean)),
    );
    if (classIds.length > 0) {
      const { data: classesRaw, error: classesErr } = await db
        .from("classes")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .in("id", classIds);
      if (classesErr) throw classesErr;
      const nameById = new Map<string, string>();
      for (const c of (classesRaw ?? []) as Array<{
        id: string;
        name: string | null;
      }>) {
        nameById.set(c.id, c.name ?? "");
      }
      for (const r of rows) {
        out.push({
          enrollmentId: r.id,
          classId: r.class_id,
          className: nameById.get(r.class_id) ?? "Kelas",
          source: "classes",
        });
      }
    }
  } catch (err) {
    logger.warn(
      "[ClassSectionAdapter] enrollments student-sections fetch failed",
      err,
    );
  }

  return out;
}

/**
 * Normalized attendance record across both sources (Issue #325 F2 closure).
 * Status normalization: rombel_attendance uses "alpa", attendance_records
 * legacy and FE config use "alpha" -- we standardize on "alpha".
 */
export interface StudentAttendanceRecord {
  id: string;
  date: string;
  status: "hadir" | "sakit" | "izin" | "alpha";
  className: string;
  source: "rombel" | "classes";
}

const STUDENT_ATTENDANCE_STATUS_ALIASES: Record<
  string,
  StudentAttendanceRecord["status"]
> = {
  hadir: "hadir",
  sakit: "sakit",
  izin: "izin",
  alpa: "alpha",
  alpha: "alpha",
};

function normalizeStudentAttendanceStatus(
  raw: string | null | undefined,
): StudentAttendanceRecord["status"] | null {
  if (!raw) return null;
  return STUDENT_ATTENDANCE_STATUS_ALIASES[raw.toLowerCase()] ?? null;
}

/**
 * Student-side attendance roll-up. Reads BOTH:
 *   - rombel_attendance (per-student per-day, primary "absen pagi" path)
 *   - attendance_records (legacy per-class scan, via enrollments)
 *
 * Merges, normalizes status, sorts by date DESC, and caps at `limit`.
 * Both sides are tenant-scoped for defense-in-depth (RLS is primary guard).
 * Failures on one side are logged and skipped so the other side still renders.
 */
export async function getStudentAttendance(
  studentId: string,
  tenantId: string,
  limit = 60,
): Promise<StudentAttendanceRecord[]> {
  const out: StudentAttendanceRecord[] = [];

  const sections = await getStudentClassSections(studentId, tenantId);
  const rombelNameById = new Map<string, string>();
  const enrollmentIdToClassName = new Map<string, string>();
  const enrollmentIds: string[] = [];
  for (const s of sections) {
    if (s.source === "rombel") {
      rombelNameById.set(s.classId, s.className);
    } else {
      enrollmentIdToClassName.set(s.enrollmentId, s.className);
      enrollmentIds.push(s.enrollmentId);
    }
  }

  if (isRombelAdapterEnabled()) {
    try {
      const { data, error } = await db
        .from("rombel_attendance")
        .select("id, attendance_date, status, rombel_id")
        .eq("student_id", studentId)
        .eq("tenant_id", tenantId)
        .order("attendance_date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      for (const r of (data ?? []) as Array<{
        id: string;
        attendance_date: string;
        status: string;
        rombel_id: string;
      }>) {
        const status = normalizeStudentAttendanceStatus(r.status);
        if (!status) continue;
        out.push({
          id: r.id,
          date: r.attendance_date,
          status,
          className: rombelNameById.get(r.rombel_id) ?? "Rombel",
          source: "rombel",
        });
      }
    } catch (err) {
      logger.warn("[ClassSectionAdapter] rombel_attendance fetch failed", err);
    }
  }

  if (enrollmentIds.length > 0) {
    try {
      const { data, error } = await db
        .from("attendance_records")
        .select("id, date, status, enrollment_id")
        .eq("tenant_id", tenantId)
        .in("enrollment_id", enrollmentIds)
        .order("date", { ascending: false })
        .limit(limit);
      if (error) throw error;
      for (const r of (data ?? []) as Array<{
        id: string;
        date: string;
        status: string;
        enrollment_id: string;
      }>) {
        const status = normalizeStudentAttendanceStatus(r.status);
        if (!status) continue;
        out.push({
          id: r.id,
          date: r.date,
          status,
          className: enrollmentIdToClassName.get(r.enrollment_id) ?? "Kelas",
          source: "classes",
        });
      }
    } catch (err) {
      logger.warn("[ClassSectionAdapter] attendance_records fetch failed", err);
    }
  }

  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out.slice(0, limit);
}
