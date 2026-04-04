import { useMemo } from 'react'

import type { DomainModule } from '@/shared/types/moduleTypes'

import type { CourseStatus } from '../types'

// ============================================================
// Types
// ============================================================

export type ReadinessItemSeverity = 'blocker' | 'warning' | 'info'

export interface ReadinessItem {
  id: string
  severity: ReadinessItemSeverity
  message: string
  /** Action hint to resolve the issue */
  hint?: string
}

export type CourseAction = 'submit_review' | 'approve' | 'publish' | 'unpublish' | 'revert_draft'

export interface CourseReadiness {
  /** 0-100 readiness score */
  readinessScore: number
  /** Items that prevent publishing */
  blockers: ReadinessItem[]
  /** Items that may cause issues but don't block */
  warnings: ReadinessItem[]
  /** Informational items about publish impact */
  infos: ReadinessItem[]
  /** All items combined (sorted: blockers → warnings → infos) */
  allItems: ReadinessItem[]
  /** Whether course is ready to publish (no blockers) */
  canPublish: boolean
  /** Actions available based on current status + role */
  availableActions: CourseAction[]
}

type UserRole = 'student' | 'teacher' | 'admin' | 'parent' | 'principal'

interface UseCourseReadinessOptions {
  modules: DomainModule[]
  courseTitle: string
  courseDescription: string | null
  courseStatus: CourseStatus
  role: UserRole | null
  assignedClassesCount?: number
}

// ============================================================
// Scoring
// ============================================================

/**
 * Compute readiness score from 0–100.
 * Each fulfilled criterion adds points. Blockers always result in canPublish=false.
 */
function computeScore(
  hasModules: boolean,
  hasLessons: boolean,
  hasPublishedLessons: boolean,
  hasDescription: boolean,
  hasNoEmptyModules: boolean
): number {
  let score = 0
  if (hasModules) score += 30
  if (hasLessons) score += 30
  if (hasPublishedLessons) score += 25
  if (hasDescription) score += 10
  if (hasNoEmptyModules) score += 5
  return score
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
function computeAvailableActions(status: CourseStatus, role: UserRole | null): CourseAction[] {
  if (!role || role === 'student' || role === 'parent') return []

  const actions: CourseAction[] = []

  switch (status) {
    case 'draft':
      // teacher/admin/principal can submit for review
      actions.push('submit_review')
      // All authorized roles can also publish directly (self-approve flow)
      actions.push('publish')
      break

    case 'in_review':
      // Admin and principal can formally approve
      if (role === 'admin' || role === 'principal') {
        actions.push('approve')
        actions.push('revert_draft')
      }
      // Teacher can also self-approve and publish
      if (role === 'teacher') {
        actions.push('approve')
        actions.push('publish')
        actions.push('revert_draft')
      }
      break

    case 'approved':
      // All authorized roles can publish an approved course
      actions.push('publish')
      actions.push('revert_draft')
      break

    case 'published':
      // Can always unpublish (revert to draft)
      actions.push('unpublish')
      break

    case 'archived':
      // Reactivate by reverting to draft
      actions.push('revert_draft')
      break
  }

  return actions
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
}: UseCourseReadinessOptions): CourseReadiness {
  return useMemo(() => {
    const blockers: ReadinessItem[] = []
    const warnings: ReadinessItem[] = []
    const infos: ReadinessItem[] = []

    // ── Checks ──────────────────────────────────────────────
    const hasModules = modules.length > 0
    const hasLessons = modules.some((m) => m.lessons && m.lessons.length > 0)
    const hasPublishedLessons = modules.some(
      (m) => m.lessons && m.lessons.some((l) => l.isPublished)
    )
    const hasDescription = !!courseDescription && courseDescription.trim().length > 0
    const emptyModules = modules.filter((m) => !m.lessons || m.lessons.length === 0)
    const hasNoEmptyModules = emptyModules.length === 0

    // ── BLOCKERS ────────────────────────────────────────────
    if (!hasModules) {
      blockers.push({
        id: 'no_modules',
        severity: 'blocker',
        message: 'Kursus belum memiliki modul',
        hint: 'Tambahkan minimal satu modul di panel kiri',
      })
    }

    if (hasModules && !hasLessons) {
      blockers.push({
        id: 'no_lessons',
        severity: 'blocker',
        message: 'Belum ada pelajaran di modul manapun',
        hint: 'Tambahkan pelajaran ke dalam modul yang ada',
      })
    }

    if (hasLessons && !hasPublishedLessons) {
      blockers.push({
        id: 'no_published_lessons',
        severity: 'blocker',
        message: 'Tidak ada pelajaran yang sudah dipublikasikan',
        hint: 'Buka pelajaran lalu ubah statusnya menjadi "Diterbitkan"',
      })
    }

    // ── WARNINGS ────────────────────────────────────────────
    if (!hasDescription) {
      warnings.push({
        id: 'no_description',
        severity: 'warning',
        message: 'Kursus belum memiliki deskripsi',
        hint: 'Tambahkan deskripsi di Pengaturan Kursus',
      })
    }

    if (hasModules && emptyModules.length > 0) {
      warnings.push({
        id: 'empty_modules',
        severity: 'warning',
        message: `${emptyModules.length} modul masih kosong (tidak ada pelajaran)`,
        hint: `Modul kosong: ${emptyModules
          .slice(0, 2)
          .map((m) => `"${m.title}"`)
          .join(', ')}${emptyModules.length > 2 ? ` +${emptyModules.length - 2} lainnya` : ''}`,
      })
    }

    if (!courseTitle || courseTitle.trim().length < 5) {
      warnings.push({
        id: 'short_title',
        severity: 'warning',
        message: 'Judul kursus terlalu pendek',
        hint: 'Gunakan judul yang deskriptif (minimal 5 karakter)',
      })
    }

    // ── INFOS ───────────────────────────────────────────────
    if (assignedClassesCount > 0) {
      infos.push({
        id: 'audience_impact',
        severity: 'info',
        message: `Kursus ini akan terlihat oleh ${assignedClassesCount} kelas yang telah ditugaskan`,
      })
    } else {
      infos.push({
        id: 'no_audience',
        severity: 'info',
        message: 'Kursus belum ditugaskan ke kelas manapun',
        hint: 'Gunakan tombol "Bagikan" untuk menugaskan kursus ke kelas',
      })
    }

    const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length ?? 0), 0)
    const publishedLessons = modules.reduce(
      (acc, m) => acc + (m.lessons?.filter((l) => l.isPublished).length ?? 0),
      0
    )

    if (totalLessons > 0) {
      infos.push({
        id: 'lesson_summary',
        severity: 'info',
        message: `${publishedLessons} dari ${totalLessons} pelajaran sudah diterbitkan`,
      })
    }

    // ── Score + canPublish ───────────────────────────────────
    const readinessScore = computeScore(
      hasModules,
      hasLessons,
      hasPublishedLessons,
      hasDescription,
      hasNoEmptyModules
    )

    const canPublish = blockers.length === 0

    // ── Available actions ────────────────────────────────────
    const availableActions = computeAvailableActions(courseStatus, role)

    const allItems: ReadinessItem[] = [...blockers, ...warnings, ...infos]

    return {
      readinessScore,
      blockers,
      warnings,
      infos,
      allItems,
      canPublish,
      availableActions,
    }
  }, [modules, courseTitle, courseDescription, courseStatus, role, assignedClassesCount])
}
