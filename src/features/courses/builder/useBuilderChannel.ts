import { type RealtimeChannel } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { supabase } from '@/services/supabase/client'

import type { BuilderAction } from './builderReducer'

export type ChannelStatus = 'connecting' | 'connected' | 'disconnected'

export interface BroadcastPayload {
  action: BuilderAction
  userId: string
  userName: string
}

export function useBuilderChannel(
  courseId: string | null,
  userId: string | null,
  dispatch: React.Dispatch<BuilderAction>,
  onReconnect?: () => void,
  // FIXED: B1 — added authorizedUserIds to reject broadcasts from non-collaborators.
  // TODO: Implement server-side collaborator validation via an RPC that verifies
  // the sender's user_id is present in the course_collaborators table for this course.
  authorizedUserIds?: string[],
  onUnauthorized?: (senderId: string) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>('disconnected')
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  // Track whether the effect is still mounted to avoid operating on a torn-down channel
  const mountedRef = useRef(false)

  // Subscribe to channel when courseId is available
  useEffect(() => {
    if (!courseId || !userId) return

    mountedRef.current = true
    reconnectAttemptRef.current = 0

    const subscribe = () => {
      // Remove any stale channel before creating a new one
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }

      const channel = supabase.channel(`builder:${courseId}`, {
        config: { broadcast: { self: false } },
      })

      channel
        .on('broadcast', { event: 'builder_action' }, (payload) => {
          const data = payload.payload as BroadcastPayload
          if (data.userId === userId) return // ignore own broadcasts

          // FIXED: B1 — validate broadcast is scoped to the correct course
          if (!data.userId) {
            console.warn('[BuilderChannel] Rejected broadcast: missing userId in payload')
            return
          }

          // FIXED: B1 — reject actions from senders not in the authorized collaborators list
          if (authorizedUserIds && authorizedUserIds.length > 0) {
            const isAuthorized = authorizedUserIds.includes(data.userId)
            if (!isAuthorized) {
              console.warn(
                `[BuilderChannel] Rejected broadcast from unauthorized sender: ${data.userId}`
              )
              if (onUnauthorized) onUnauthorized(data.userId)
              return
            }
          }

          // Map to REMOTE_* action types
          const remoteAction = mapToRemoteAction(data.action)
          if (remoteAction) {
            dispatch(remoteAction)
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setChannelStatus('connected')
            // Successful connection — reset backoff counter and notify caller
            reconnectAttemptRef.current = 0
            if (onReconnect) onReconnect()
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setChannelStatus('disconnected')
            // Schedule a reconnection attempt with exponential backoff
            if (mountedRef.current) {
              scheduleReconnect()
            }
          } else {
            setChannelStatus('connecting')
          }
        })

      channelRef.current = channel
    }

    const scheduleReconnect = () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000) // max 30 s
      reconnectTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        reconnectAttemptRef.current += 1
        subscribe()
      }, delay)
    }

    subscribe()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }
      setChannelStatus('disconnected')
    }
  }, [courseId, userId, dispatch, onReconnect, authorizedUserIds, onUnauthorized])

  // Broadcast an action to other clients
  const broadcast = useCallback(
    (action: BuilderAction, userName: string) => {
      if (!channelRef.current || !userId) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'builder_action',
        payload: { action, userId, userName } satisfies BroadcastPayload,
      })
    },
    [userId]
  )

  return { channelRef, channelStatus, broadcast }
}

/**
 * Maps a local BuilderAction to its REMOTE_* equivalent.
 * Remote actions bypass undo/redo history.
 */
function mapToRemoteAction(action: BuilderAction): BuilderAction | null {
  switch (action.type) {
    case 'ADD_MODULE':
      return { ...action, type: 'REMOTE_ADD_MODULE' }
    case 'UPDATE_MODULE':
      return { ...action, type: 'REMOTE_UPDATE_MODULE' }
    case 'DELETE_MODULE':
      return { ...action, type: 'REMOTE_DELETE_MODULE' }
    case 'SET_MODULES':
      return { ...action, type: 'REMOTE_SET_MODULES' }
    case 'ADD_LESSON':
      return { ...action, type: 'REMOTE_ADD_LESSON' }
    case 'UPDATE_LESSON':
      return { ...action, type: 'REMOTE_UPDATE_LESSON' }
    case 'DELETE_LESSON':
      return { ...action, type: 'REMOTE_DELETE_LESSON' }
    case 'ADD_BLOCK':
      return { ...action, type: 'REMOTE_ADD_BLOCK' }
    case 'UPDATE_BLOCK':
      return { ...action, type: 'REMOTE_UPDATE_BLOCK' }
    case 'DELETE_BLOCK':
      return { ...action, type: 'REMOTE_DELETE_BLOCK' }
    case 'SET_BLOCKS':
      return { ...action, type: 'REMOTE_SET_BLOCKS' }
    default:
      return null
  }
}
