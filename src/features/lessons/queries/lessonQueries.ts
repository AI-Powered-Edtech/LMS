import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonService } from '../api/lessonService';
import { lessonKeys } from './lessonKeys';
import { useAuth } from '../../../contexts/AuthContext';

export function useLesson(lessonId: string) {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: lessonKeys.detail(tenantId!, lessonId),
        queryFn: () => lessonService.fetchLesson(lessonId, tenantId!),
        enabled: !!tenantId && !!lessonId,
    });
}

export function useModuleLessons(moduleId: string, userId: string) {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: lessonKeys.list(tenantId!, { moduleId, userId }),
        queryFn: () => lessonService.fetchModuleLessons(moduleId, userId, tenantId!),
        enabled: !!tenantId && !!moduleId && !!userId,
    });
}

export function useLessonProgress(lessonId: string, userId: string) {
    const { tenantId } = useAuth();
    
    return useQuery({
        queryKey: [...lessonKeys.progress(tenantId!, userId), lessonId],
        queryFn: () => lessonService.fetchProgress(lessonId, userId, tenantId!),
        enabled: !!tenantId && !!lessonId && !!userId,
    });
}

export function useUpdateLessonProgress() {
    const queryClient = useQueryClient();
    const { tenantId, user } = useAuth();
    
    return useMutation({
        mutationFn: ({ 
            lessonId, 
            status, 
            progressPercentage, 
            lastPosition 
        }: { 
            lessonId: string; 
            status: 'started' | 'in_progress' | 'completed'; 
            progressPercentage: number; 
            lastPosition?: number 
        }) => lessonService.updateProgress(lessonId, tenantId!, status, progressPercentage, lastPosition),
        onSuccess: (_, variables) => {
            if (tenantId && user) {
                queryClient.invalidateQueries({ queryKey: [...lessonKeys.progress(tenantId, user.id), variables.lessonId] });
                queryClient.invalidateQueries({ queryKey: lessonKeys.lists(tenantId) }); // Module lessons includes progress
            }
        },
    });
}

export function useQueueProgressUpdate() {
    const queryClient = useQueryClient();
    const { tenantId, user } = useAuth();
    
    return useMutation({
        mutationFn: ({ 
            lessonId, 
            status, 
            progressPercentage, 
            lastPosition 
        }: { 
            lessonId: string; 
            status: 'started' | 'in_progress' | 'completed'; 
            progressPercentage: number; 
            lastPosition?: number 
        }) => lessonService.queueProgressUpdate(lessonId, tenantId!, status, progressPercentage, lastPosition),
        onSuccess: (_, variables) => {
             if (tenantId && user) {
                queryClient.invalidateQueries({ queryKey: [...lessonKeys.progress(tenantId, user.id), variables.lessonId] });
                queryClient.invalidateQueries({ queryKey: lessonKeys.lists(tenantId) });
             }
        }
    });
}

export function useProcessOfflineQueue() {
    const queryClient = useQueryClient();
    const { tenantId, user } = useAuth();

    return useMutation({
        mutationFn: () => lessonService.processOfflineQueue(tenantId!),
        onSuccess: () => {
            // Re-sync all progress after processing offline queue
            if (tenantId && user) {
                queryClient.invalidateQueries({ queryKey: lessonKeys.progress(tenantId, user.id) });
                queryClient.invalidateQueries({ queryKey: lessonKeys.lists(tenantId) });
            }
        },
    });
}

export function useCompleteLesson() {
    const queryClient = useQueryClient();
    const { tenantId, user } = useAuth();
    
    return useMutation({
        mutationFn: (lessonId: string) => lessonService.completeLesson(lessonId, tenantId!),
        onSuccess: (_, lessonId) => {
            if (tenantId && user) {
                queryClient.invalidateQueries({ queryKey: [...lessonKeys.progress(tenantId, user.id), lessonId] });
                queryClient.invalidateQueries({ queryKey: lessonKeys.lists(tenantId) });
            }
        },
    });
}

export function useSeedDummyVideo() {
    const queryClient = useQueryClient();
    const { tenantId } = useAuth();

    return useMutation({
        mutationFn: ({ lessonId, videoUrl }: { lessonId: string; videoUrl: string }) =>
            lessonService.seedDummyVideo(lessonId, tenantId!, videoUrl),
        onSuccess: (_, variables) => {
            // Invalidate lesson detail to pick up new video resource
            if (tenantId) {
                queryClient.invalidateQueries({ queryKey: lessonKeys.detail(tenantId, variables.lessonId) });
            }
        },
    });
}
