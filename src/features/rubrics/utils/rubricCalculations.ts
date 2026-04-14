import type { RubricCriterion, RubricScore } from '../types'

/**
 * Calculate the total possible points from all criteria's max_points.
 */
export function calculateTotalPoints(criteria: RubricCriterion[]): number {
  return criteria.reduce((sum, c) => sum + c.max_points, 0)
}

/**
 * Calculate earned points from the scored submission.
 * Maps each score's criterion_id to the scored value and sums them.
 */
export function calculateEarnedPoints(criteria: RubricCriterion[], scores: RubricScore[]): number {
  const scoreMap = new Map(scores.map((s) => [s.criterion_id, s.score]))
  return criteria.reduce((sum, c) => {
    const earned = scoreMap.get(c.id) ?? 0
    return sum + Number(earned)
  }, 0)
}

/**
 * Calculate percentage (0–100) from earned vs total points.
 * Returns 0 if total is 0 to avoid division by zero.
 */
export function calculateRubricPercentage(earned: number, total: number): number {
  if (total === 0) return 0
  return Math.min(100, Math.max(0, Math.round((earned / total) * 100)))
}

/**
 * Returns true when every criterion has at least one score entry.
 */
export function isRubricComplete(criteria: RubricCriterion[], scores: RubricScore[]): boolean {
  if (criteria.length === 0) return false
  const scoredIds = new Set(scores.map((s) => s.criterion_id))
  return criteria.every((c) => scoredIds.has(c.id))
}

/**
 * Validate a rubric draft before saving.
 * Returns an array of Indonesian error messages.
 */
export function validateRubric(rubric: {
  title: string
  criteria: Array<{
    title: string
    max_points: number
    levels: Array<{ label: string; points: number }>
  }>
}): string[] {
  const errors: string[] = []

  if (!rubric.title?.trim()) {
    errors.push('Judul rubrik tidak boleh kosong.')
  }

  if (rubric.criteria.length === 0) {
    errors.push('Rubrik harus memiliki setidaknya satu kriteria.')
  }

  rubric.criteria.forEach((c, idx) => {
    const num = idx + 1
    if (!c.title?.trim()) {
      errors.push(`Kriteria #${num}: judul tidak boleh kosong.`)
    }
    if (c.max_points <= 0) {
      errors.push(`Kriteria #${num}: poin maksimal harus lebih dari 0.`)
    }
    if (c.levels.length === 0) {
      errors.push(`Kriteria #${num}: harus memiliki setidaknya satu tingkat penilaian.`)
    }
    c.levels.forEach((l, li) => {
      if (!l.label?.trim()) {
        errors.push(`Kriteria #${num}, tingkat #${li + 1}: label tidak boleh kosong.`)
      }
      if (l.points < 0) {
        errors.push(`Kriteria #${num}, tingkat #${li + 1}: poin tidak boleh negatif.`)
      }
    })
  })

  return errors
}
