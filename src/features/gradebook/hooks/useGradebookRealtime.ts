/**
 * Gradebook Realtime Updates Hook
 *
 * Subscribes to WebSocket channel for gradebook changes and updates React Query cache.
 * Enables real-time grade updates without polling.
 *
 * Features:
 * - Real-time INSERT/UPDATE/DELETE detection
 * - Automatic React Query cache updates
 * - Fallback to polling if WebSocket unavailable
 * - Connection status tracking
 * - Auto-cleanup on unmount
 *
 * Usage:
 * ```tsx
 * const { isConnected, isFallbackToPolling } = useGradebookRealtime(courseId)
 *
 * // In your component:
 * if (isFallbackToPolling) {
 *   // Show indicator that we're using polling instead of realtime
 * }
 * ```
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getRealtimeProvider } from '@/services/realtime/realtimeProvider'
import { gradebookKeys } from '@/features/gradebook/queries/gradebookKeys'
import type { GradebookEntry } from '@/features/gradebook/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UseGradebookRealtimeOptions {
  enabled?: boolean
  onEntryInserted?: (entry: GradebookEntry) => void
  onEntryUpdated?: (entry: GradebookEntry) => void
  onEntryDeleted?: (entryId: string) => void
  onError?: (error: Error) => void
}

interface GradebookRealtimeState {
  isConnected: boolean
  isSubscribed: boolean
  isFallbackToPolling: boolean
  lastUpdateAt?: Date
  error?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBSCRIPTION_TIMEOUT = 5000 // 5 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useGradebookRealtime(
  courseId: string | undefined,
  options: UseGradebookRealtimeOptions = {}
): GradebookRealtimeState {
  const {
    enabled = true,
    onEntryInserted,
    onEntryUpdated,
    onEntryDeleted,
    onError: _onError,
  } = options

  const queryClient = useQueryClient()
  const [state, setState] = useState<GradebookRealtimeState>({
    isConnected: false,
    isSubscribed: false,
    isFallbackToPolling: false,
  })

  const channelRef = useRef<ReturnType<ReturnType<typeof getRealtimeProvider>['channel']> | null>(
    null
  )
  const retryCountRef = useRef(0)
  const subscriptionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // ─── Handle Database Changes ──────────────────────────────────────────────

  const handleDatabaseChange = useCallback(
    (payload: {
      eventType: 'INSERT' | 'UPDATE' | 'DELETE'
      table: string
      schema: string
      new?: GradebookEntry
      old?: GradebookEntry
      commit_timestamp: string
    }) => {
      if (!courseId) return

      const { eventType, table, new: newRecord, old } = payload

      // Update query cache based on event type
      if (table === 'gradebook_entries') {
        if (eventType === 'INSERT' && newRecord) {
          // New grade entry added
          queryClient.setQueryData(
            gradebookKeys.entries(courseId),
            (oldEntries: GradebookEntry[] | undefined) => {
              if (!oldEntries) return [newRecord]
              return [...oldEntries, newRecord]
            }
          )
          onEntryInserted?.(newRecord)
        }

        if (eventType === 'UPDATE' && newRecord) {
          // Grade entry updated
          queryClient.setQueryData(
            gradebookKeys.entries(courseId),
            (oldEntries: GradebookEntry[] | undefined) => {
              if (!oldEntries) return [newRecord]
              return oldEntries.map((entry) => (entry.id === newRecord.id ? newRecord : entry))
            }
          )
          onEntryUpdated?.(newRecord)
        }

        if (eventType === 'DELETE' && old) {
          // Grade entry deleted
          const entryId = (old as any).id
          queryClient.setQueryData(
            gradebookKeys.entries(courseId),
            (oldEntries: GradebookEntry[] | undefined) => {
              if (!oldEntries) return []
              return oldEntries.filter((entry) => entry.id !== entryId)
            }
          )
          onEntryDeleted?.(entryId)
        }

        // Invalidate queries to trigger refetch
        void queryClient.invalidateQueries({
          queryKey: gradebookKeys.entries(courseId),
        })

        // Update state
        setState((prev) => ({
          ...prev,
          lastUpdateAt: new Date(),
        }))
      }

      if (table === 'gradebook_settings') {
        // Settings changed - invalidate settings query
        void queryClient.invalidateQueries({
          queryKey: gradebookKeys.settings(courseId),
        })
      }

      if (table === 'gradebook_columns') {
        // Columns changed - invalidate columns query
        void queryClient.invalidateQueries({
          queryKey: gradebookKeys.columns(courseId),
        })
      }
    },
    [courseId, queryClient, onEntryInserted, onEntryUpdated, onEntryDeleted]
  )

  // ─── Setup WebSocket Subscription ─────────────────────────────────────────

  const setupSubscription = useCallback(() => {
    if (!courseId || !enabled) return

    const realtime = getRealtimeProvider()
    if (!realtime) {
      setState((prev) => ({
        ...prev,
        isFallbackToPolling: true,
        error: 'Realtime provider unavailable',
      }))
      return
    }

    // Create channel
    const channelName = `gradebook:course:${courseId}`
    const channel = realtime.channel(channelName)
    channelRef.current = channel

    // Subscribe to database changes
    channel.on(
      'postgres_changes',
      {
        event: '*', // INSERT, UPDATE, DELETE
        schema: 'public',
        table: 'gradebook_entries',
        filter: `course_id=eq.${courseId}`,
      },
      handleDatabaseChange
    )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gradebook_settings',
        filter: `course_id=eq.${courseId}`,
      },
      handleDatabaseChange
    )

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'gradebook_columns',
        filter: `course_id=eq.${courseId}`,
      },
      handleDatabaseChange
    )

    // Subscribe to channel
    channel.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        if (subscriptionTimeoutRef.current) {
          clearTimeout(subscriptionTimeoutRef.current)
          subscriptionTimeoutRef.current = null
        }

        retryCountRef.current = 0
        setState({
          isConnected: true,
          isSubscribed: true,
          isFallbackToPolling: false,
        })
      }

      if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          isSubscribed: false,
          error: status === 'CHANNEL_ERROR' ? 'Connection error' : 'Channel closed',
        }))

        // Retry logic
        if (retryCountRef.current < MAX_RETRIES) {
          retryCountRef.current++
          setTimeout(() => {
            setupSubscription()
          }, RETRY_DELAY * retryCountRef.current)
        } else {
          setState((prev) => ({
            ...prev,
            isFallbackToPolling: true,
            error: 'Max retries reached',
          }))
        }
      }
    })

    // Timeout detection
    subscriptionTimeoutRef.current = setTimeout(() => {
      setState((prev) => ({
        ...prev,
        isFallbackToPolling: true,
        error: 'Subscription timeout',
      }))
    }, SUBSCRIPTION_TIMEOUT)
  }, [courseId, enabled, handleDatabaseChange])

  // ─── Cleanup ──────────────────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (subscriptionTimeoutRef.current) {
      clearTimeout(subscriptionTimeoutRef.current)
      subscriptionTimeoutRef.current = null
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe()
      const realtime = getRealtimeProvider()
      if (realtime) {
        realtime.removeChannel(channelRef.current)
      }
      channelRef.current = null
    }
  }, [])

  // ─── Effect ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!courseId || !enabled) {
      cleanup()
      setState({
        isConnected: false,
        isSubscribed: false,
        isFallbackToPolling: false,
      })
      return
    }

    setupSubscription()

    return cleanup()
  }, [courseId, enabled, setupSubscription, cleanup])

  return state
}

export default useGradebookRealtime
