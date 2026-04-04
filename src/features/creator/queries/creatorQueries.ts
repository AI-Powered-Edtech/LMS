/**
 * Creator React Query hooks
 * Wraps the generate-ai-content Edge Function and history queries.
 */

import { useMutation, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase/client'

import {
  creatorService,
  type GeneratedContent as ServiceGeneratedContent,
} from '../api/creatorService'
import type { CreatorHistoryItem, GeneratedContent } from '../types'

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Mutation hook for generating AI content from a file.
 * Uses the generate-ai-content Edge Function via creatorService.
 */
export function useGenerateAIContent() {
  return useMutation<GeneratedContent, Error, FormData>({
    mutationFn: async (formData: FormData) => {
      const data: ServiceGeneratedContent = await creatorService.generateAIContent(formData)
      // Normalize to the shared GeneratedContent type
      return {
        id: data.id ?? '',
        type: data.type ?? 'quiz',
        summary: data.summary ?? '',
        questions: (data.questions ?? []).map((q) => ({
          id: q.id,
          text: q.text ?? q.question ?? '',
          options: q.options,
          answer: q.answer,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          bloomLevel: q.bloomLevel,
        })),
      } satisfies GeneratedContent
    },
  })
}

/**
 * Mutation hook to mark a generated content record as used.
 */
export function useMarkContentUsed() {
  return useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creator_history')
        .update({ is_used: true })
        .eq('id', id)

      if (error) {
        // Silently fail — non-critical operation
        if (import.meta.env.DEV) console.warn('[useMarkContentUsed] update failed:', error.message)
      }
    },
  })
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Query hook for fetching creator generation history.
 * Falls back to empty array if table does not exist yet.
 */
export function useCreatorHistory() {
  const { user, tenantId } = useAuth()

  return useQuery<CreatorHistoryItem[]>({
    queryKey: ['creator', 'history', tenantId, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_history')
        .select('id, type, summary, questions, created_at, file_name, is_used')
        .eq('tenant_id', tenantId!)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        // Table may not exist on all environments
        if (import.meta.env.DEV) console.warn('[useCreatorHistory]', error.message)
        return []
      }

      return (data ?? []) as CreatorHistoryItem[]
    },
    enabled: !!tenantId && !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
