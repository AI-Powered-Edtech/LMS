// Types
export * from './types';

// Service
export { analyticsService } from './api/analyticsService';

// Learning event tracking (SP-12)
export { trackLearningEvent, startEventFlushing, stopEventFlushing } from './api/trackingService';
export { LearningSessionProvider, useLearningSession } from './context/LearningSessionContext';
export { useOptionalLearningSession } from './hooks/useOptionalLearningSession';

// SP-12.3: Dashboard components
export { TeacherAnalyticsDashboard } from './components/TeacherAnalyticsDashboard';
export { useCourseDashboard, useLessonDashboard, useStudentSignals } from './queries/analyticsQueries';

// SP-14: Funnel Analysis components
export { FunnelChart } from './components/FunnelChart';
export { FunnelBuilder } from './components/FunnelBuilder';
export { FunnelComparison } from './components/FunnelComparison';

// SP-15: Retention & Cohort components
export { RetentionHeatmap } from './components/RetentionHeatmap';
export { StickinessDashboard } from './components/StickinessDashboard';
export { CohortBuilder } from './components/CohortBuilder';

// SP-16: Engagement Scoring components
export { EngagementRadar } from './components/EngagementRadar';
export { SegmentPieChart } from './components/SegmentPieChart';
export { EngagementTrend } from './components/EngagementTrend';
export { StudentEngagementCard } from './components/StudentEngagementCard';
export { EngagementDashboard } from './components/EngagementDashboard';

// SP-17: Learning Path Analysis components
export { PathFlowDiagram } from './components/PathFlowDiagram';
export { PathComparison } from './components/PathComparison';
export { DeadEndDetector } from './components/DeadEndDetector';
export { PathAnalysisDashboard } from './components/PathAnalysisDashboard';
export { useLearningPaths, useStudentPath } from './queries/analyticsQueries';

// SP-19: Predictive Analytics components
export { RiskRadar } from './components/RiskRadar';
export { EarlyWarningPanel } from './components/EarlyWarningPanel';
export { PredictionCard } from './components/PredictionCard';
export { useAtRiskStudents, usePredictionSummary, useStudentPrediction } from './queries/analyticsQueries';

// SP-24: Live Activity components
export { LiveActivityFeed } from './components/LiveActivityFeed';
export { ActiveNowIndicator } from './components/ActiveNowIndicator';
export { LiveLessonMap } from './components/LiveLessonMap';
