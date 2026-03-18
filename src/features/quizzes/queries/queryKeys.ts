// Quiz Query Keys — tenant-scoped for multi-tenant cache isolation
// Uses createQueryKeys factory to enforce tenantId in every key.

import { createQueryKeys } from '@/src/lib/queryKeys';

const base = createQueryKeys('quiz');

export const QuizKeys = {
  ...base,

  // Student queries
  studentAssignments: (tenantId: string) =>
    [...base.all(tenantId), 'studentAssignments'] as const,

  userAttempts: (tenantId: string) =>
    [...base.all(tenantId), 'userAttempts'] as const,

  attemptQuestions: (attemptId: string, tenantId: string) =>
    [...base.all(tenantId), 'attemptQuestions', attemptId] as const,

  activeAttempt: (quizId: string, tenantId: string, assignmentId?: string | null) =>
    [...base.all(tenantId), 'activeAttempt', quizId, assignmentId] as const,

  // Teacher queries
  teacherQuizzes: (tenantId: string) =>
    [...base.all(tenantId), 'teacherQuizzes'] as const,

  quizzesByClass: (classId: string, tenantId: string) =>
    [...base.all(tenantId), 'quizzesByClass', classId] as const,

  quizWithQuestions: (quizId: string, tenantId: string) =>
    [...base.all(tenantId), 'quizWithQuestions', quizId] as const,

  assignmentsByQuiz: (quizId: string, tenantId: string) =>
    [...base.all(tenantId), 'assignmentsByQuiz', quizId] as const,

  assignmentsByClass: (classId: string, tenantId: string) =>
    [...base.all(tenantId), 'assignmentsByClass', classId] as const,

  assignmentResults: (assignmentId: string, tenantId: string) =>
    [...base.all(tenantId), 'assignmentResults', assignmentId] as const,
} as const;
