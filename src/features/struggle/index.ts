// Components
export { NotificationBell } from './components/NotificationBell';
export { StruggleHelpPrompt } from './components/StruggleHelpPrompt';
export { StruggleConfigPanel } from './components/StruggleConfigPanel';
export { StruggleAlertPanel } from './components/StruggleAlertPanel';

// Hooks
export {
  useStruggleConfig,
  useUpdateStruggleConfig,
  useStruggleAlerts,
  useUnreadAlertCount,
  useMarkAlertsRead,
  useMyLessonStatus,
} from './queries/useStruggleQueries';

// Types
export type { StruggleAlert, StruggleConfig, LessonStatus } from './types';

// Utils
export { severityColors, severityLabel, scoreToPercent, relativeTime } from './utils/struggleHelpers';
