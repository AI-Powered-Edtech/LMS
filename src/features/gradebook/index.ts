/**
 * Gradebook Feature Module
 *
 * Consolidated exports for the Gradebook feature.
 */

// Components
export { GradebookExportActions } from "./components/GradebookExportActions";
export { GradebookMainTable } from "./components/GradebookMainTable";
export { GradebookMobileCards } from "./components/GradebookMobileCards";
export { GradebookSkeleton } from "./components/GradebookSkeleton";
export { GradebookStats } from "./components/GradebookStats";
export { GradebookTable } from "./components/GradebookTable";
export { StudentGradeView } from "./components/StudentGradeView";

// Hooks
export { useExportReport } from "./hooks/useExportReport";
export {
  useGradebook,
  useGradebookQuery,
  useUpdateGrade,
} from "./hooks/useGradebookQueries";
export { useGradebookRealtime } from "./hooks/useGradebookRealtime";
export { useGradebookState } from "./hooks/useGradebookState";

// Queries
export {
  useGradebookEntries,
  useGradebookSettings,
  useSyncGradebook,
  useUpdateGradebookEntry,
  useUpsertGradebookSettings,
} from "./queries/useGradebook";

// Types
export type { GradebookAssignment } from "./api/legacyGradebookService";
export type {
  GradebookEntry,
  GradebookSettings,
  GradebookStudent,
} from "./types";
