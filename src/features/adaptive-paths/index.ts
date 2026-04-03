// Types
export type {
  ConditionType,
  ConditionValue,
  EvaluationResult,
  LessonNode,
  PathRule,
  PathRuleInsert,
} from './types'

// Service
export { adaptivePathService } from './api/adaptivePathService'

// Query keys
export { adaptivePathKeys, adaptivePathQueryKeys } from './queries/adaptivePathKeys'

// Queries / mutations
export {
  useCreatePathRule,
  useDeletePathRule,
  useEvaluateNextLesson,
  usePathRules,
  useUpdatePathRule,
} from './queries/adaptivePathQueries'

// Components
export { PathConditionPicker, CONDITION_LABELS } from './components/PathConditionPicker'
export { PathRuleCard } from './components/PathRuleCard'
export { PathRuleEditor } from './components/PathRuleEditor'
export { PathRuleList } from './components/PathRuleList'
export { RemedialBanner } from './components/RemedialBanner'

// Utils
export { evaluateRulesClientSide } from './utils/pathEvaluator'
