import { useCallback, useEffect, useRef, useState } from 'react'

import type { AppRealtimeChannel } from '@/services/realtime'

export interface PresenceData {
  userId: string
  fullName: string
  avatarUrl: string | null
  activeBlockId: string | null
  color: string
  onlineAt: string
}

// Deterministic color assignment from user ID
const PRESENCE_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
]

function getColorForUser(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length]
}

export function useBuilderPresence(
  channelRef: React.RefObject<AppRealtimeChannel | null>,
  userId: string | null,
  fullName: string,
  avatarUrl: string | null
) {
  const [others, setOthers] = useState<Map<string, PresenceData>>(new Map())
  const myPresenceRef = useRef<Partial<PresenceData>>({})

  // Track presence
  useEffect(() => {
    const channel = channelRef.current
    if (!channel || !userId) return

    const myColor = getColorForUser(userId)

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<PresenceData>()
      const newOthers = new Map<string, PresenceData>()
      for (const [, presences] of Object.entries(state)) {
        for (const p of presences) {
          if (p.userId !== userId) {
            newOthers.set(p.userId, p as unknown as PresenceData)
          }
        }
      }
      setOthers(newOthers)
    })

    // Track my presence
    void channel.track({
      userId,
      fullName,
      avatarUrl,
      activeBlockId: null,
      color: myColor,
      onlineAt: new Date().toISOString(),
    } satisfies PresenceData)

    return () => {
      void channel.untrack()
    }
  }, [channelRef, userId, fullName, avatarUrl])

  // Update which block I'm editing
  const updateActiveBlock = useCallback(
    (blockId: string | null) => {
      const channel = channelRef.current
      if (!channel || !userId) return
      myPresenceRef.current.activeBlockId = blockId
      void channel.track({
        userId,
        fullName,
        avatarUrl,
        activeBlockId: blockId,
        color: getColorForUser(userId),
        onlineAt: new Date().toISOString(),
      } satisfies PresenceData)
    },
    [channelRef, userId, fullName, avatarUrl]
  )

  // Check if a block is locked by another user
  const getBlockLocker = useCallback(
    (blockId: string): PresenceData | null => {
      for (const [, p] of others) {
        if (p.activeBlockId === blockId) return p
      }
      return null
    },
    [others]
  )

  return {
    others,
    updateActiveBlock,
    getBlockLocker,
    othersArray: Array.from(others.values()),
  }
}
