/**
 * AI Tutor Queries - React Query hooks for AI Tutor feature
 */

import { useMutation } from '@tanstack/react-query';
import { askTutor, type AITutorResponse, type AITutorError, type AskTutorOptions } from '../api/aiTutorService';

// ─── Query Keys ───

export const aiTutorKeys = {
    all: ['aiTutor'] as const,
    history: (lessonId: string) => ['aiTutor', 'history', lessonId] as const,
};

// ─── Mutations ───

interface UseAskTutorOptions {
    onSuccess?: (data: AITutorResponse) => void;
    onError?: (error: AITutorError) => void;
}

export function useAskTutor(options?: UseAskTutorOptions) {
    return useMutation({
        mutationFn: async (params: AskTutorOptions) => {
            const result = await askTutor(
                params.lessonId,
                params.question,
                params.tenantId,
                params.sessionId
            );

            if (result.error) {
                throw result.error;
            }

            return result.data;
        },
        onSuccess: options?.onSuccess,
        onError: options?.onError,
    });
}

// ─── Queries ───

// Note: Chat history is not currently persisted in the database.
// The ai_tutor_sessions and ai_tutor_messages tables exist but
// are not used by the current implementation. If chat history
// persistence is needed in the future, this query can be implemented:
//
// export function useAITutorHistory(lessonId: string) {
//   return useQuery({
//     queryKey: aiTutorKeys.history(lessonId),
//     queryFn: async () => {
//       const { data, error } = await supabase
//         .from('ai_tutor_messages')
//         .select('*')
//         .eq('lesson_id', lessonId)
//         .order('created_at', { ascending: true });
//       
//       if (error) throw error;
//       return data;
//     },
//   });
// }
