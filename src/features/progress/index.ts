// API/Services
export { progressService } from './api/progressService'
export { studentProgressService } from './api/studentProgressService'

// Hooks
export { useAddXP, useStudentProgressData } from './hooks/useStudentProgressQueries'

// Queries
export {
  useProgressList,
  useStudentAchievements,
  useStudentProgressSummary,
} from './queries/progressQueries'

// Components
export { ProgressSkeleton } from './components/ProgressSkeleton'
export { StudentProgressDashboard } from './components/StudentProgressDashboard'

// Types
export type { StudentProgressData } from './api/progressService'
export type { AchievementData, ModuleStatus } from './api/studentProgressService'
