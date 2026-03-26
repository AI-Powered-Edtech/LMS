// API/Services
export { progressService } from './api/progressService'
export { studentProgressService } from './api/studentProgressService'

// Hooks
export { useAddXP, useStudentProgressData } from './hooks/useStudentProgressQueries'

// Types
export type { StudentProgressData } from './api/progressService'
export type { AchievementData, ModuleStatus } from './api/studentProgressService'
