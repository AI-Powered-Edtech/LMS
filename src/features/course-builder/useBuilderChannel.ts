import { useCallback, useEffect, useRef, useState } from 'react'

import { getRealtimeProvider, type AppRealtimeChannel } from '@/services/realtime'
import { logDevWarn } from '@/utils/logDevError'

import { auditService } from './api/auditService'
import type { BuilderAction } from './builderReducer'

export type ChannelStatus = 'connecting' | 'connected' | 'disconnected' | 'unauthorized'

export interface BroadcastPayload {
  action: BuilderAction
  userId: string
  userName: string
}

export function useBuilderChannel(
  courseId: string | null,
  userId: string | null,
  dispatch: React.Dispatch<BuilderAction>,
  /**
   * Called when the channel successfully (re)connects after a prior disconnection.
   * MUST be wrapped in `useCallback` at the call site — a new function reference
   * on every render will cause the effect to re-run and trigger a reconnect loop.
   */
  onReconnect?: () => void,
  /**
   * Set of userIds known to be authorized collaborators (from collaboratorService).
   *
   * Note: A new `Set` instance is required to trigger a re-run of this effect.
   * Mutating an existing Set (e.g. set.add(id)) will NOT trigger the effect
   * because React compares the reference, not the contents.
   */
  authorizedUserIds?: Set<string>
) {
  const channelRef = useRef<AppRealtimeChannel | null>(null)
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>('disconnected')
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptRef = useRef(0)
  // Track whether the effect is still mounted to avoid operating on a torn-down channel
  const mountedRef = useRef(false)
  // Cache the server-side access check result to avoid repeated RPC calls on reconnect
  const accessCheckedRef = useRef<boolean | null>(null)

  useEffect(() => {
    if (!courseId || !userId) return

    mountedRef.current = true
    reconnectAttemptRef.current = 0
    accessCheckedRef.current = null // reset on courseId change

    const subscribe = async () => {
      // ── Server-side access check (one-time per courseId) ──
      if (accessCheckedRef.current === null) {
        const authorized = await auditService.checkBuilderAccess(courseId)
        if (!mountedRef.current) return // component unmounted during the check

        if (!authorized) {
          logDevWarn(
            'useBuilderChannel',
            `User ${userId} is NOT authorized to join builder channel for course ${courseId}. Aborting subscription.`
          )
          setChannelStatus('unauthorized')
          return
        }

        accessCheckedRef.current = true
      }

      // Remove any stale channel before creating a new one
      if (channelRef.current) {
        void channelRef.current.unsubscribe()
        channelRef.current = null
      }

      const channel = getRealtimeProvider().channel(`builder:${courseId}`, {
        config: { broadcast: { self: false } },
      })

      channel
        .on('broadcast', { event: 'builder_action' }, (payload) => {
          const data = payload.payload as BroadcastPayload

          // Ignore own broadcasts
          if (data.userId === userId) return

          // Client-side collaborator guard (defense-in-depth):
          // Reject broadcasts from users not in the known collaborator set.
          // The primary guard is the server-side channel access check above.
          if (authorizedUserIds && authorizedUserIds.size > 0) {
            if (!authorizedUserIds.has(data.userId)) {
              logDevWarn(
                'useBuilderChannel',
                `Rejected broadcast from unauthorized sender: ${data.userId}`
              )
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
            // Only fire onReconnect for actual reconnects, not the initial connect
            if (onReconnect && reconnectAttemptRef.current > 0) {
              onReconnect()
            }
            reconnectAttemptRef.current = 0
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setChannelStatus('disconnected')
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
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000)
      reconnectTimerRef.current = setTimeout(() => {
        if (!mountedRef.current) return
        reconnectAttemptRef.current += 1
        void subscribe()
      }, delay)
    }

    void subscribe()

    return () => {
      mountedRef.current = false
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (channelRef.current) {
        void channelRef.current.unsubscribe()
        channelRef.current = null
      }
      setChannelStatus('disconnected')
    }
  }, [courseId, userId, dispatch, onReconnect, authorizedUserIds])

  // Broadcast an action to other clients
  const broadcast = useCallback(
    (action: BuilderAction, userName: string) => {
      if (!channelRef.current || !userId) return
      // Don't broadcast if not authorized
      if (channelStatus === 'unauthorized') return

      void channelRef.current.send({
        type: 'broadcast',
        event: 'builder_action',
        payload: { action, userId, userName } satisfies BroadcastPayload,
      })
    },
    [userId, channelStatus]
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
