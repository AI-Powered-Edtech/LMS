// ==========================================================================
// useMessages — React Query hooks + Supabase Realtime untuk Pesan Parent-Teacher
// Wave 4 — Task 29.5: Message Teacher Feature
// ==========================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase/client'
import { STALE } from '@/utils/queryConstants'

import type { CreateThreadParams, MessageThread, ThreadMessage } from '../api/messageApi'
import {
  createThread,
  getMessages,
  getThreads,
  markThreadRead,
  sendMessage,
} from '../api/messageApi'

// ── Query Keys ─────────────────────────────────────────────────────────────

export const messageKeys = {
  threads: (userId: string) => ['parent', 'threads', userId] as const,
  messages: (threadId: string) => ['parent', 'messages', threadId] as const,
}

// ── useThreads ─────────────────────────────────────────────────────────────

/**
 * Hook untuk mendapatkan semua thread percakapan parent-teacher.
 * Termasuk Supabase Realtime subscription untuk update otomatis.
 */
export function useThreads() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: messageKeys.threads(user?.id ?? ''),
    queryFn: () => getThreads(user!.id),
    enabled: !!user?.id,
    staleTime: STALE.MODERATE,
    refetchInterval: 30_000, // Fallback polling setiap 30 detik
  })

  // Realtime subscription untuk perubahan thread (unread count, last_message_at)
  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`parent_threads:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'parent_teacher_threads',
          filter: `parent_id=eq.${user.id}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: messageKeys.threads(user.id) })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [user?.id, queryClient])

  return query
}

// ── useMessages ────────────────────────────────────────────────────────────

/**
 * Hook untuk mendapatkan semua pesan dalam satu thread.
 * Termasuk Supabase Realtime subscription untuk pesan baru.
 */
export function useMessages(threadId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: messageKeys.messages(threadId ?? ''),
    queryFn: () => getMessages(threadId!),
    enabled: !!threadId,
    staleTime: STALE.DYNAMIC,
    refetchInterval: false, // Gunakan realtime saja
  })

  // Realtime subscription untuk pesan baru dalam thread ini
  useEffect(() => {
    if (!threadId) return

    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_teacher_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        () => {
          // Refetch messages dan threads (untuk update unread count + last_message_at)
          void queryClient.invalidateQueries({ queryKey: messageKeys.messages(threadId) })
          if (user?.id) {
            void queryClient.invalidateQueries({ queryKey: messageKeys.threads(user.id) })
          }
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [threadId, user?.id, queryClient])

  return query
}

// ── useSendMessage ─────────────────────────────────────────────────────────

/**
 * Mutation untuk mengirim pesan baru dalam thread.
 * Optimistic update: pesan langsung muncul sebelum response dari server.
 */
export function useSendMessage(threadId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (content: string) => {
      if (!threadId) throw new Error('Thread ID tidak ditemukan')
      return sendMessage(threadId, content)
    },
    onMutate: async (content: string) => {
      // Cancel inflight queries
      await queryClient.cancelQueries({ queryKey: messageKeys.messages(threadId ?? '') })

      // Snapshot sebelum optimistic update
      const previousMessages = queryClient.getQueryData<ThreadMessage[]>(
        messageKeys.messages(threadId ?? '')
      )

      // Optimistic update: tambahkan pesan sementara
      const optimisticMessage: ThreadMessage = {
        id: `optimistic-${Date.now()}`,
        thread_id: threadId ?? '',
        tenant_id: '',
        sender_id: user?.id ?? '',
        content,
        created_at: new Date().toISOString(),
        sender_name: 'Anda',
        sender_avatar: null,
      }

      queryClient.setQueryData<ThreadMessage[]>(messageKeys.messages(threadId ?? ''), (old) => [
        ...(old ?? []),
        optimisticMessage,
      ])

      return { previousMessages }
    },
    onError: (_err, _content, context) => {
      // Rollback optimistic update jika gagal
      if (context?.previousMessages !== undefined) {
        queryClient.setQueryData(messageKeys.messages(threadId ?? ''), context.previousMessages)
      }
    },
    onSuccess: (newMessage) => {
      // Replace optimistic message dengan data asli dari server
      queryClient.setQueryData<ThreadMessage[]>(messageKeys.messages(threadId ?? ''), (old) =>
        (old ?? []).filter((m) => !m.id.startsWith('optimistic-')).concat(newMessage)
      )
      // Invalidate threads untuk update last_message_at
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.threads(user.id) })
      }
    },
  })
}

// ── useMarkThreadRead ──────────────────────────────────────────────────────

/**
 * Mutation untuk menandai thread sebagai sudah dibaca.
 */
export function useMarkThreadRead() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ threadId, role }: { threadId: string; role: 'parent' | 'teacher' }) =>
      markThreadRead(threadId, role),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.threads(user.id) })
      }
    },
  })
}

// ── useCreateThread ────────────────────────────────────────────────────────

/**
 * Mutation untuk membuat thread percakapan baru.
 */
export function useCreateThread() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: CreateThreadParams) => createThread(params),
    onSuccess: () => {
      if (user?.id) {
        void queryClient.invalidateQueries({ queryKey: messageKeys.threads(user.id) })
      }
    },
  })
}

// ── Re-export types for convenience ───────────────────────────────────────

export type { CreateThreadParams, MessageThread, ThreadMessage }
