// Types — only externally consumed types
<<<<<<< Updated upstream
export type { ActivityTimePoint, CourseEngagement } from './types'
=======
export type { ActivityTimePoint,CourseEngagement } from './types'
>>>>>>> Stashed changes
export { AnalyticsError } from './types'

// Learning event tracking (SP-12)
export { LearningSessionProvider, useLearningSession } from './context/LearningSessionContext'
export { useOptionalLearningSession } from './hooks/useOptionalLearningSession'

// SP-12.3: Dashboard components
export { TeacherAnalyticsDashboard } from './components/TeacherAnalyticsDashboard'
