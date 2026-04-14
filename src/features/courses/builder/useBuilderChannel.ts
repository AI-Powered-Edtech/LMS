import { api, apiFetch } from '@/src/lib/api'
import { useCallback, useEffect, useRef, useState } from 'react'

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
  onReconnect?: () => void
) {
  const channelRef = useRef<any | null>(null)
  const [channelStatus, setChannelStatus] = useState<ChannelStatus>('disconnected')

  // Subscribe to channel when courseId is available
  useEffect(() => {
    if (!courseId || !userId) return

    const channel = api.channel(`builder:${courseId}`, {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'builder_action' }, (payload) => {
        const data = payload.payload as BroadcastPayload
        if (data.userId === userId) return // ignore own broadcasts

        // Map to REMOTE_* action types
        const remoteAction = mapToRemoteAction(data.action)
        if (remoteAction) {
          dispatch(remoteAction)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setChannelStatus('connected')
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setChannelStatus('disconnected')
        } else {
          setChannelStatus('connecting')
        }
      })

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      channelRef.current = null
      setChannelStatus('disconnected')
    }
  }, [courseId, userId, dispatch, onReconnect])

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
