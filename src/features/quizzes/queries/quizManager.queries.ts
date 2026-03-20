// Quiz Manager Queries - React Query hooks for teacher quiz management
// Part of the Quiz Engine Refactor

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as quizManagerService from '../api/quizManager.service';
import * as quizAssignmentService from '../api/quizAssignment.service';
import { QuizKeys } from './queryKeys';

// ============================================
// Query Hooks - Teacher
// ============================================

/**
 * Get all quizzes for a teacher
 */
export function useTeacherQuizzes(tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.teacherQuizzes(tenantId),
    queryFn: () => quizManagerService.getTeacherQuizzes(tenantId!),
    enabled: !!tenantId,
  });
}

/**
 * Get quizzes by class
 */
export function useQuizzesByClass(classId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.quizzesByClass(classId!, tenantId),
    queryFn: () => quizManagerService.getQuizzesByClass(classId!, tenantId!),
    enabled: !!classId && !!tenantId,
  });
}

/**
 * Get quiz with questions
 */
export function useQuizWithQuestions(quizId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.quizWithQuestions(quizId!, tenantId),
    queryFn: () => quizManagerService.getQuizWithQuestions(quizId!, tenantId!),
    enabled: !!quizId && !!tenantId,
  });
}

/**
 * Get assignments by quiz
 */
export function useAssignmentsByQuiz(quizId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.assignmentsByQuiz(quizId!, tenantId),
    queryFn: () => quizAssignmentService.getAssignmentsByQuiz(quizId!, tenantId!),
    enabled: !!quizId && !!tenantId,
  });
}

/**
 * Get assignments by class
 */
export function useAssignmentsByClass(classId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.assignmentsByClass(classId!, tenantId),
    queryFn: () => quizAssignmentService.getAssignmentsByClass(classId!, tenantId!),
    enabled: !!classId && !!tenantId,
  });
}

/**
 * Get assignment results
 */
export function useAssignmentResults(assignmentId: string | undefined, tenantId: string | undefined) {
  return useQuery({
    queryKey: QuizKeys.assignmentResults(assignmentId!, tenantId),
    queryFn: () => quizManagerService.getAssignmentResults(assignmentId!, tenantId!),
    enabled: !!assignmentId && !!tenantId,
  });
}

// ============================================
// Mutation Hooks - Teacher
// ============================================

/**
 * Create a new quiz
 */
export function useCreateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: quizManagerService.createQuiz,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.teacherQuizzes(variables.tenant_id) });
    },
  });
}

/**
 * Update quiz
 */
export function useUpdateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, updates, tenantId }: { quizId: string; updates: Record<string, unknown>; tenantId: string }) =>
      quizManagerService.updateQuiz(quizId, updates, tenantId),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.teacherQuizzes(tenantId) });
      queryClient.invalidateQueries({ queryKey: QuizKeys.quizWithQuestions(quizId, tenantId) });
    },
  });
}

/**
 * Delete quiz
 */
export function useDeleteQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, tenantId }: { quizId: string; tenantId: string }) => quizManagerService.deleteQuiz(quizId, tenantId),
    onSuccess: (_, { tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.teacherQuizzes(tenantId) });
    },
  });
}

/**
 * Set quiz status
 */
export function useSetQuizStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ quizId, status, tenantId }: { quizId: string; status: 'draft' | 'published'; tenantId: string }) =>
      quizManagerService.setQuizStatus(quizId, status, tenantId),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.teacherQuizzes(tenantId) });
      queryClient.invalidateQueries({ queryKey: QuizKeys.quizWithQuestions(quizId, tenantId) });
    },
  });
}

/**
 * Add question to quiz
 */
export function useAddQuestionToQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      tenantId,
      question,
    }: {
      quizId: string;
      tenantId: string;
      question: Parameters<typeof quizManagerService.addQuestionToQuiz>[2];
    }) => quizManagerService.addQuestionToQuiz(quizId, tenantId, question),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.quizWithQuestions(quizId, tenantId) });
    },
  });
}

/**
 * Update quiz question
 */
export function useUpdateQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, updates, quizId, tenantId }: { questionId: string; updates: Record<string, unknown>; quizId: string; tenantId: string }) =>
      quizManagerService.updateQuizQuestion(questionId, updates, tenantId),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.quizWithQuestions(quizId, tenantId) });
    },
  });
}

/**
 * Delete quiz question
 */
export function useDeleteQuizQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ questionId, quizId, tenantId }: { questionId: string; quizId: string; tenantId: string }) => quizManagerService.deleteQuizQuestion(questionId, tenantId),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.quizWithQuestions(quizId, tenantId) });
    },
  });
}

/**
 * Replace question options
 */
export function useReplaceQuestionOptions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questionId,
      tenantId,
      options,
      quizId,
    }: {
      questionId: string;
      tenantId: string;
      options: Parameters<typeof quizManagerService.replaceQuestionOptions>[2];
      quizId: string;
    }) => quizManagerService.replaceQuestionOptions(questionId, tenantId, options),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.quizWithQuestions(quizId, tenantId) });
    },
  });
}

/**
 * Assign quiz to classes
 */
export function useAssignQuizToClasses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      tenantId,
      assignments,
    }: {
      quizId: string;
      tenantId: string;
      assignments: Parameters<typeof quizAssignmentService.assignQuizToClasses>[2];
    }) => quizAssignmentService.assignQuizToClasses(quizId, tenantId, assignments),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.assignmentsByQuiz(quizId, tenantId) });
    },
  });
}

/**
 * Update quiz assignment
 */
export function useUpdateQuizAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, updates, quizId, tenantId }: { assignmentId: string; updates: Record<string, unknown>; quizId: string; tenantId: string }) =>
      quizAssignmentService.updateQuizAssignment(assignmentId, updates, tenantId),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.assignmentsByQuiz(quizId, tenantId) });
      // Invalidate all assignmentsByClass for this tenant (classId unknown at mutation level)
      queryClient.invalidateQueries({ queryKey: QuizKeys.all(tenantId), predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey.includes('assignmentsByClass')
      });
    },
  });
}

/**
 * Remove quiz assignment
 */
export function useRemoveQuizAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ assignmentId, quizId, tenantId }: { assignmentId: string; quizId: string; tenantId: string }) => quizAssignmentService.removeQuizAssignment(assignmentId, tenantId),
    onSuccess: (_, { quizId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.assignmentsByQuiz(quizId, tenantId) });
      // Invalidate all assignmentsByClass for this tenant (classId unknown at mutation level)
      queryClient.invalidateQueries({ queryKey: QuizKeys.all(tenantId), predicate: (query) =>
        Array.isArray(query.queryKey) && query.queryKey.includes('assignmentsByClass')
      });
    },
  });
}

/**
 * Grade attempt question
 */
export function useGradeAttemptQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      attemptId,
      questionId,
      pointsEarned,
      isCorrect,
      comment,
    }: {
      attemptId: string;
      questionId: string;
      pointsEarned: number;
      isCorrect: boolean;
      comment?: string;
      assignmentId: string;
      tenantId: string;
    }) => quizManagerService.gradeAttemptQuestion(attemptId, questionId, pointsEarned, isCorrect, comment),
    onSuccess: (_, { assignmentId, tenantId }) => {
      queryClient.invalidateQueries({ queryKey: QuizKeys.assignmentResults(assignmentId, tenantId) });
    },
  });
}
