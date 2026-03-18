// Backward compatibility shim for the legacy quiz service
// New consumers should import directly from @features/quizzes/api
import * as quizzes from '../features/quizzes/api/quizzes.service';
export const quizService = quizzes;

export * from '../features/quizzes/api/quizzes.service';
export * from '../features/quizzes/types/quizzes.types';
