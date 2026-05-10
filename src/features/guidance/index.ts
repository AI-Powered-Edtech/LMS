// SP-18: In-App Learning Guidance

// Types
export type {
  GuideSegment,
  GuideTrigger,
  GuideType,
  LearningGuide,
} from "./types";

// Hooks
export {
  useDeleteGuide,
  useGuideList,
  useUpsertGuide,
} from "./queries/useGuidanceQueries";

// Student-facing components
export { GuideRenderer } from "./components/GuideRenderer";
