// SP-18: In-App Learning Guidance

// Types
export * from './types';

// Service
export { guidanceService } from './api/guidanceService';

// Hooks
export {
    useApplicableGuides,
    useGuideList,
    useUpsertGuide,
    useDeleteGuide,
    useRecordInteraction,
} from './queries/useGuidanceQueries';

// Student-facing components
export { GuideRenderer } from './components/GuideRenderer';
export { BannerGuide } from './components/BannerGuide';
export { TooltipGuide } from './components/TooltipGuide';
export { WalkthroughGuide } from './components/WalkthroughGuide';
export { CheckpointGuide } from './components/CheckpointGuide';
