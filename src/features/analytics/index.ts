// Types
export * from './types';

// Service
export { analyticsService } from './api/analyticsService';

// Learning event tracking (SP-12)
export { trackLearningEvent, startEventFlushing, stopEventFlushing } from './api/trackingService';
export { LearningSessionProvider, useLearningSession } from './context/LearningSessionContext';
export { useOptionalLearningSession } from './hooks/useOptionalLearningSession';
