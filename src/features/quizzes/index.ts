// Public API for the quizzes feature
// Part of the Quiz Engine Refactor
// This file exports the new modular API for use by other parts of the application.

// Types
export * from './types/quizzes.types';

// Services (for direct usage if needed)
export * as quizPlayerService from './api/quizPlayer.service';
export * as quizManagerService from './api/quizManager.service';
export * as quizAssignmentService from './api/quizAssignment.service';

// React Query Hooks
export * from './queries/quizPlayer.queries';
export * from './queries/quizPlayer.mutations';
export * from './queries/quizManager.queries';
export { QuizKeys } from './queries/queryKeys';

// Custom Hooks
export * from './hooks';

// Store
export * from './store/quizPlayer.store';

// Components
export * from './components/player';
