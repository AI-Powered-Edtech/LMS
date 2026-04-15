// ─── Service ──────────────────────────────────────────────────────────────────
export { rubricService } from './api/rubricService'

// ─── Query keys ───────────────────────────────────────────────────────────────
export { rubricKeys, rubricQueryKeys } from './queries/rubricKeys'

// ─── Queries & mutations ──────────────────────────────────────────────────────
export {
  useDeleteRubric,
  useRubricByAssignment,
  useRubricById,
  useRubricScores,
  useRubricTemplates,
  useSaveRubric,
  useScoreSubmission,
} from './queries/rubricQueries'

// ─── Hooks ────────────────────────────────────────────────────────────────────
export { useRubricBuilder } from './hooks/useRubricBuilder'

// ─── Components ───────────────────────────────────────────────────────────────
export { RubricBuilder } from './components/RubricBuilder'
export { RubricCriterionRow } from './components/RubricCriterionRow'
export { RubricLevelCell } from './components/RubricLevelCell'
export { RubricPreview } from './components/RubricPreview'
export { RubricScoringGrid } from './components/RubricScoringGrid'
export { RubricTemplateModal } from './components/RubricTemplateModal'

// ─── Utils ────────────────────────────────────────────────────────────────────
export {
  calculateEarnedPoints,
  calculateRubricPercentage,
  calculateTotalPoints,
  isRubricComplete,
  validateRubric,
} from './utils/rubricCalculations'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  Rubric,
  RubricCriterion,
  RubricInsert,
  RubricLevel,
  RubricScore,
  RubricTemplateSummary,
} from './types'
