import { useMemo } from "react";

import type { Role } from "@/contexts/AuthContext";
import type { DomainModule } from "@/shared/types/moduleTypes";

import type { CourseStatus } from "../types";

// ============================================================
// Types
// ============================================================

export type ReadinessItemSeverity = "blocker" | "warning" | "info";

export interface ReadinessItem {
  id: string;
  severity: ReadinessItemSeverity;
  message: string;
  /** Action hint to resolve the issue */
  hint?: string;
}

export type CourseAction =
  | "submit_review"
  | "approve"
  | "publish"
  | "unpublish"
  | "revert_draft";

export interface CourseReadiness {
  /** 0-100 readiness score */
  readinessScore: number;
  /** Items that prevent publishing */
  blockers: ReadinessItem[];
  /** Items that may cause issues but don't block */
  warnings: ReadinessItem[];
  /** Informational items about publish impact */
  infos: ReadinessItem[];
  /** All items combined (sorted: blockers → warnings → infos) */
  allItems: ReadinessItem[];
  /** Whether course is ready to publish (no blockers) */
  canPublish: boolean;
  /** Actions available based on current status + role */
  availableActions: CourseAction[];
}

/** UserRole is an alias for the shared Role type from AuthContext */
export type UserRole = Role;

interface UseCourseReadinessOptions {
  modules: DomainModule[];
  courseTitle: string;
  courseDescription: string | null;
  courseStatus: CourseStatus;
  role: UserRole | null;
  assignedClassesCount?: number;
  /** Whether course has a cover/thumbnail image */
  hasThumbnail?: boolean;
  /** Sum of durationMinutes across all lessons (0 = not set, undefined = not checked) */
  totalLessonDuration?: number;
}

// ============================================================
// Scoring
// ============================================================

/**
 * Compute readiness score from 0–100.
 * Each fulfilled criterion adds points. Blockers always result in canPublish=false.
 * Max raw score is 110; capped at 100 via Math.min.
 */
function computeScore(
  hasModules: boolean,
  hasLessons: boolean,
  hasPublishedLessons: boolean,
  hasDescription: boolean,
  hasNoEmptyModules: boolean,
  hasThumbnail: boolean,
  hasDuration: boolean,
): number {
  let score = 0;
  if (hasModules) score += 30;
  if (hasLessons) score += 30;
  if (hasPublishedLessons) score += 25;
  if (hasDescription) score += 10;
  if (hasNoEmptyModules) score += 5;
  if (hasThumbnail) score += 5;
  if (hasDuration) score += 5;
  return Math.min(score, 100);
}

// ============================================================
// Available action matrix
// ============================================================

/**
 * Determine which actions are available based on status + role.
 *
 * Role capabilities:
 * - teacher: submit_review, publish (self-approve allowed), unpublish, revert_draft
 * - admin: all + approve
 * - principal: all + approve
 */
function computeAvailableActions(
  status: CourseStatus,
  role: UserRole | null,
): CourseAction[] {
  if (!role || role === "student" || role === "parent") return [];

  const actions: CourseAction[] = [];

  // State machine per Design Spec Opsi B:
  //   draft --submit_review--> in_review --approve--> approved --publish--> published
  //                                     \\--request_changes (revert)--> draft
  //   published --unpublish--> draft
  // Reviewers = admin | principal. Teachers author & submit but cannot self-approve.
  // Teachers in personal tenants are provisioned as admin/principal, so they still get reviewer actions.
  switch (status) {
    case "draft":
      // Author submits for review. No direct publish from draft in Opsi B.
      actions.push("submit_review");
      break;

    case "in_review":
      // Only reviewers (admin/principal) can approve or send back to draft.
      if (role === "admin" || role === "principal") {
        actions.push("approve");
        actions.push("revert_draft");
      }
      // Teacher who submitted can retract their submission back to draft.
      if (role === "teacher") {
        actions.push("revert_draft");
      }
      break;

    case "approved":
      // Approved courses can be published by any authorized role; reviewers can also revert.
      actions.push("publish");
      if (role === "admin" || role === "principal") {
        actions.push("revert_draft");
      }
      break;

    case "published":
      // Can always unpublish (revert to draft).
      actions.push("unpublish");
      break;

    case "archived":
      // Reactivate by reverting to draft.
      actions.push("revert_draft");
      break;
  }

  return actions;
}

// ============================================================
// Hook
// ============================================================

export function useCourseReadiness({
  modules,
  courseTitle,
  courseDescription,
  courseStatus,
  role,
  assignedClassesCount = 0,
  hasThumbnail,
  totalLessonDuration,
}: UseCourseReadinessOptions): CourseReadiness {
  return useMemo(() => {
    const blockers: ReadinessItem[] = [];
    const warnings: ReadinessItem[] = [];
    const infos: ReadinessItem[] = [];

    // ── Checks ──────────────────────────────────────────────
    const hasModules = modules.length > 0;
    const hasDescription =
      !!courseDescription && courseDescription.trim().length > 0;

    // ⚡ Bolt: Consolidated multiple array iterations (some, filter, reduce) into a single
    // pass using nested for-loops to eliminate intermediate array allocations and O(N) overhead.
    let hasLessons = false;
    let hasPublishedLessons = false;
    let publishedLessonsCount = 0;
    const emptyModules: DomainModule[] = [];

    for (let i = 0; i < modules.length; i++) {
      const m = modules[i];
      if (!m.lessons || m.lessons.length === 0) {
        emptyModules.push(m);
      } else {
        hasLessons = true;
        for (let j = 0; j < m.lessons.length; j++) {
          if (m.lessons[j].isPublished) {
            hasPublishedLessons = true;
            publishedLessonsCount++;
          }
        }
      }
    }

    const hasNoEmptyModules = emptyModules.length === 0;

    // ── BLOCKERS ────────────────────────────────────────────
    if (!hasModules) {
      blockers.push({
        id: "no_modules",
        severity: "blocker",
        message: "Kursus belum memiliki modul",
        hint: "Tambahkan minimal satu modul di panel kiri",
      });
    }

    if (hasModules && !hasLessons) {
      blockers.push({
        id: "no_lessons",
        severity: "blocker",
        message: "Belum ada pelajaran di modul manapun",
        hint: "Tambahkan pelajaran ke dalam modul yang ada",
      });
    }

    if (hasLessons && !hasPublishedLessons) {
      blockers.push({
        id: "no_published_lessons",
        severity: "blocker",
        message: "Tidak ada pelajaran yang sudah dipublikasikan",
        hint: 'Buka pelajaran lalu ubah statusnya menjadi "Diterbitkan"',
      });
    }

    // ── WARNINGS ────────────────────────────────────────────
    if (!hasDescription) {
      warnings.push({
        id: "no_description",
        severity: "warning",
        message: "Kursus belum memiliki deskripsi",
        hint: "Tambahkan deskripsi di Pengaturan Kursus",
      });
    }

    if (hasModules && emptyModules.length > 0) {
      warnings.push({
        id: "empty_modules",
        severity: "warning",
        message: `${emptyModules.length} modul masih kosong (tidak ada pelajaran)`,
        hint: `Modul kosong: ${emptyModules
          .slice(0, 2)
          .map((m) => `"${m.title}"`)
          .join(
            ", ",
          )}${emptyModules.length > 2 ? ` +${emptyModules.length - 2} lainnya` : ""}`,
      });
    }

    if (!courseTitle || courseTitle.trim().length < 5) {
      warnings.push({
        id: "short_title",
        severity: "warning",
        message: "Judul kursus terlalu pendek",
        hint: "Gunakan judul yang deskriptif (minimal 5 karakter)",
      });
    }

    // Warn about missing thumbnail only when explicitly set to false (undefined = not checked)
    if (hasThumbnail === false) {
      warnings.push({
        id: "no_thumbnail",
        severity: "warning",
        message: "Kursus belum memiliki foto sampul",
        hint: "Tambahkan foto sampul untuk meningkatkan daya tarik kursus",
      });
    }

    // Warn about missing lesson durations only when explicitly 0 AND there are published lessons
    if (totalLessonDuration === 0 && hasPublishedLessons) {
      warnings.push({
        id: "no_duration",
        severity: "warning",
        message: "Estimasi durasi belajar belum diisi",
        hint: "Isi durasi pada setiap pelajaran agar siswa tahu perkiraan waktu belajar",
      });
    }

    // Warn when published lesson count is too low (< 3) but some exist
    if (hasPublishedLessons && publishedLessonsCount < 3) {
      warnings.push({
        id: "few_lessons",
        severity: "warning",
        message: "Kursus terlalu singkat (kurang dari 3 pelajaran)",
        hint: "Pertimbangkan menambahkan lebih banyak pelajaran untuk pengalaman belajar yang lebih lengkap",
      });
    }

    // ── INFOS ───────────────────────────────────────────────
    if (assignedClassesCount > 0) {
      infos.push({
        id: "audience_impact",
        severity: "info",
        message: `Kursus ini akan terlihat oleh ${assignedClassesCount} kelas yang telah ditugaskan`,
      });
    } else {
      infos.push({
        id: "no_audience",
        severity: "info",
        message: "Kursus belum ditugaskan ke kelas manapun",
        hint: 'Gunakan tombol "Bagikan" untuk menugaskan kursus ke kelas',
      });
    }

    const totalLessons = modules.reduce(
      (acc, m) => acc + (m.lessons?.length ?? 0),
      0,
    );

    if (totalLessons > 0) {
      infos.push({
        id: "lesson_summary",
        severity: "info",
        message: `${publishedLessonsCount} dari ${totalLessons} pelajaran sudah diterbitkan`,
      });
    }

    // ── Score + canPublish ───────────────────────────────────
    const readinessScore = computeScore(
      hasModules,
      hasLessons,
      hasPublishedLessons,
      hasDescription,
      hasNoEmptyModules,
      // Only count thumbnail bonus when explicitly true
      hasThumbnail === true,
      // Only count duration bonus when explicitly > 0
      typeof totalLessonDuration === "number" && totalLessonDuration > 0,
    );

    const canPublish = blockers.length === 0;

    // ── Available actions ────────────────────────────────────
    const availableActions = computeAvailableActions(courseStatus, role);

    const allItems: ReadinessItem[] = [...blockers, ...warnings, ...infos];

    return {
      readinessScore,
      blockers,
      warnings,
      infos,
      allItems,
      canPublish,
      availableActions,
    };
  }, [
    modules,
    courseTitle,
    courseDescription,
    courseStatus,
    role,
    assignedClassesCount,
    hasThumbnail,
    totalLessonDuration,
  ]);
}
