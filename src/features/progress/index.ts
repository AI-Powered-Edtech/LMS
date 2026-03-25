// API/Services
export { progressService } from './api/progressService'
export { studentProgressService } from './api/studentProgressService'

// Hooks
export { useStudentProgressData, useAddXP } from './hooks/useStudentProgressQueries'

// Types
export type { StudentProgressData } from './api/progressService'
export type { ModuleStatus, AchievementData } from './api/studentProgressService'
