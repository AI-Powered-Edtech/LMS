// SP-18: In-App Learning Guidance

// Types
export type { LearningGuide, GuideType, GuideTrigger, GuideSegment } from './types'

// Hooks
export { useGuideList, useUpsertGuide, useDeleteGuide } from './queries/useGuidanceQueries'

// Student-facing components
export { GuideRenderer } from './components/GuideRenderer'
