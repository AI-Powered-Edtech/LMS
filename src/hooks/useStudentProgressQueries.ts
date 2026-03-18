import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { createQueryKeys } from '../lib/queryKeys';
import {
    studentProgressService,
    LessonStatus,
    ModuleStatus,
    LessonProgress,
    QuizAttempt,
    ModuleData,
    AchievementData,
    AssignmentData,
} from '../services/studentProgressService';
import { REMEDIAL_CONTENT_MAP, RemedialContent } from '../constants/remedialContent';

// Re-export types for consumers
export type { LessonStatus, ModuleStatus, LessonProgress, QuizAttempt, ModuleData, AchievementData, AssignmentData };
export type Achievement = AchievementData & { icon: 'crown' | 'zap' | 'target' | 'star' };
export type Assignment = AssignmentData;

const base = createQueryKeys('student-progress');
const progressKeys = {
    ...base,
    modules: (tenantId: string) => [...base.all(tenantId), 'modules'] as const,
    lessons: (userId: string, tenantId: string) =>
        [...base.all(tenantId), 'lessons', userId] as const,
    quizAttempts: (userId: string, tenantId: string) =>
        [...base.all(tenantId), 'quizAttempts', userId] as const,
    xp: (userId: string, tenantId: string) =>
        [...base.all(tenantId), 'xp', userId] as const,
    achievements: (userId: string, tenantId: string) =>
        [...base.all(tenantId), 'achievements', userId] as const,
    assignments: (tenantId: string) =>
        [...base.all(tenantId), 'assignments'] as const,
};

/**
 * Main hook for fetching all student progress data.
 * Uses React Query for caching and background refetching.
 */
export function useStudentProgressData() {
    const { user, tenantId } = useAuth();
    const userId = user?.id;

    // Modules query
    const modules = useQuery({
        queryKey: progressKeys.modules(tenantId!),
        queryFn: () => studentProgressService.fetchModules(tenantId!),
        enabled: !!tenantId,
    });

    // Lesson progress query
    const lessonProgress = useQuery({
        queryKey: progressKeys.lessons(userId!, tenantId!),
        queryFn: () => studentProgressService.fetchLessonProgress(userId!, tenantId!),
        enabled: !!userId && !!tenantId,
    });

    // Quiz attempts query
    const quizAttempts = useQuery({
        queryKey: progressKeys.quizAttempts(userId!, tenantId!),
        queryFn: () => studentProgressService.fetchQuizAttempts(userId!, tenantId!),
        enabled: !!userId && !!tenantId,
    });

    // XP query
    const xp = useQuery({
        queryKey: progressKeys.xp(userId!, tenantId!),
        queryFn: () => studentProgressService.fetchXP(userId!, tenantId!),
        enabled: !!userId && !!tenantId,
    });

    // Achievements query
    const achievements = useQuery({
        queryKey: progressKeys.achievements(userId!, tenantId!),
        queryFn: async () => {
            const badges = await studentProgressService.fetchAchievements(userId!, tenantId!);
            return badges.map(b => ({ ...b, icon: b.icon as Achievement['icon'] }));
        },
        enabled: !!userId && !!tenantId,
    });

    // Assignments query
    const assignments = useQuery({
        queryKey: progressKeys.assignments(tenantId!),
        queryFn: () => studentProgressService.fetchAssignments(tenantId!),
        enabled: !!tenantId,
    });

    const loading = modules.isLoading || lessonProgress.isLoading;

    return {
        modules: modules.data ?? [],
        lessonProgress: lessonProgress.data ?? {},
        quizAttempts: quizAttempts.data ?? {},
        xp: xp.data ?? 0,
        dailyGoal: 50, // Static value as in original context
        achievements: achievements.data ?? [],
        assignments: assignments.data ?? [],
        loading,
        // Keep derived functions
        getModuleStatus: (moduleId: string): ModuleStatus => {
            return modules.data?.find(m => m.id === moduleId)?.status || 'locked';
        },
        unlockModule: (moduleId: string) => {
            // This would need to be implemented with a mutation if needed
            console.warn('unlockModule not implemented in React Query hooks');
        },
        getRemedialContent: (quizId: string): RemedialContent | null => {
            return REMEDIAL_CONTENT_MAP[quizId] || null;
        },
    };
}

/**
 * Hook for updating lesson progress.
 */
export function useUpdateLessonProgress() {
    const queryClient = useQueryClient();
    const { user, tenantId } = useAuth();
    const userId = user?.id;

    return useMutation({
        mutationFn: async ({
            lessonId,
            progress,
            status,
            score,
        }: {
            lessonId: string;
            progress: number;
            status: LessonStatus;
            score?: number;
        }) => {
            if (!userId || !tenantId) throw new Error('Missing user or tenant');
            const completed = status === 'completed';
            await studentProgressService.updateLessonProgress(userId, lessonId, completed, tenantId);
            return { lessonId, progress, status, score };
        },
        onSuccess: (data) => {
            // Optimistically update the cache
            if (userId && tenantId) {
                queryClient.setQueryData<Record<string, LessonProgress>>(
                    progressKeys.lessons(userId, tenantId),
                    (old) => {
                        if (!old) return old;
                        return {
                            ...old,
                            [data.lessonId]: {
                                lessonId: data.lessonId,
                                moduleId: data.lessonId,
                                status: data.status,
                                progress: data.progress,
                                score: data.score ?? old[data.lessonId]?.score,
                                lastAccessed: new Date(),
                            },
                        };
                    }
                );
            }
        },
    });
}

/**
 * Hook for adding XP to a user.
 */
export function useAddXP() {
    const queryClient = useQueryClient();
    const { user, tenantId } = useAuth();
    const userId = user?.id;

    return useMutation({
        mutationFn: async (amount: number) => {
            if (!userId) throw new Error('Missing user');
            await studentProgressService.addXP(userId, amount);
            return amount;
        },
        onMutate: async (amount) => {
            // Optimistically update XP cache before server responds
            if (userId && tenantId) {
                await queryClient.cancelQueries({ queryKey: progressKeys.xp(userId, tenantId) });
                const previousXp = queryClient.getQueryData<number>(progressKeys.xp(userId, tenantId));
                queryClient.setQueryData<number>(
                    progressKeys.xp(userId, tenantId),
                    (old) => (old ?? 0) + amount
                );
                return { previousXp };
            }
        },
        onError: (_err, _amount, context) => {
            // Rollback on error
            if (userId && tenantId && context?.previousXp !== undefined) {
                queryClient.setQueryData(progressKeys.xp(userId, tenantId), context.previousXp);
            }
        },
        onSettled: () => {
            // Re-sync with server after mutation settles
            if (userId && tenantId) {
                queryClient.invalidateQueries({ queryKey: progressKeys.xp(userId, tenantId) });
            }
        },
    });
}

// Keep utility functions as pure exports (they don't need React Query)
export function getModuleStatus(modules: ModuleData[], moduleId: string): ModuleStatus {
    return modules.find(m => m.id === moduleId)?.status || 'locked';
}

export function getRemedialContent(quizId: string): RemedialContent | null {
    return REMEDIAL_CONTENT_MAP[quizId] || null;
}
