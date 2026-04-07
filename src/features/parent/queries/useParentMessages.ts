// ==========================================================================
// Parent Queries — useParentMessages
// React Query hooks untuk pesan orang tua
// ==========================================================================

import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { createQueryKeys } from '@/shared/lib/queryKeys'
import { STALE } from '@/utils/queryConstants'

import type { MessageThread, ThreadMessage } from '../api/messageApi'
import { getMessages, getThreads } from '../api/messageApi'

// ── Query Keys ──────────────────────────────────────────────────

const base = createQueryKeys('parent-messages')

export const parentMessageKeys = {
  threads: (userId: string) => [...base.all(userId), 'threads'] as const,
  messages: (threadId: string) => [...base.all(threadId), 'messages'] as const,
}

// ── Hooks ───────────────────────────────────────────────────────

/**
 * Mendapatkan semua thread percakapan untuk orang tua.
 */
export function useParentThreads() {
  const { user } = useAuth()

  return useQuery<MessageThread[]>({
    queryKey: parentMessageKeys.threads(user?.id ?? ''),
    queryFn: () => getThreads(user!.id),
    enabled: !!user?.id,
    staleTime: STALE.DYNAMIC,
    refetchInterval: false,
  })
}

/**
 * Mendapatkan semua pesan dalam sebuah thread.
 */
export function useThreadMessages(threadId: string | undefined) {
  return useQuery<ThreadMessage[]>({
    queryKey: parentMessageKeys.messages(threadId ?? ''),
    queryFn: () => getMessages(threadId!),
    enabled: !!threadId,
    staleTime: STALE.DYNAMIC,
    refetchInterval: false,
  })
}
