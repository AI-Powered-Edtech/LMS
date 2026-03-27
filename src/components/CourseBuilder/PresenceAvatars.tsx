// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import type { PresenceData } from '@/src/features/courses/builder/useBuilderPresence'
import { cn } from '@/src/utils/cn'

interface PresenceAvatarsProps {
  others: PresenceData[]
}

const MAX_VISIBLE = 4

export function PresenceAvatars({ others }: PresenceAvatarsProps) {
  if (others.length === 0) return null

  const visible = others.slice(0, MAX_VISIBLE)
  const overflow = others.length - MAX_VISIBLE

  return (
    <div className="flex items-center">
      <AnimatePresence mode="popLayout">
        {visible.map((p) => (
          <AvatarCircle key={p.userId} presence={p} />
        ))}
      </AnimatePresence>

      {overflow > 0 && (
        <span
          className={cn(
            '-ml-2 z-10 flex h-8 w-8 items-center justify-center rounded-full',
            'bg-slate-200 text-xs font-semibold text-slate-600',
            'ring-2 ring-white',
            'dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-900'
          )}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}

function AvatarCircle({ presence }: { presence: PresenceData }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const initial = presence.fullName?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <motion.div
      initial={%DOPEN% opacity: 0, scale: 0.5 %DCLOSE%}
      animate={%DOPEN% opacity: 1, scale: 1 %DCLOSE%}
      exit={%DOPEN% opacity: 0, scale: 0.5 %DCLOSE%}
      transition={%DOPEN% duration: 0.2 %DCLOSE%}
      className="relative -ml-2 first:ml-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          'ring-2 ring-white dark:ring-slate-900'
        )}
        style={%DOPEN% borderColor: presence.color, borderWidth: 2, borderStyle: 'solid' %DCLOSE%}
      >
        {presence.avatarUrl ? (
          <img
            src={presence.avatarUrl}
            alt={presence.fullName}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center rounded-full',
              'bg-slate-200 text-xs font-semibold text-slate-600',
              'dark:bg-slate-700 dark:text-slate-300'
            )}
          >
            {initial}
          </span>
        )}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={%DOPEN% opacity: 0, y: 4 %DCLOSE%}
            animate={%DOPEN% opacity: 1, y: 0 %DCLOSE%}
            exit={%DOPEN% opacity: 0, y: 4 %DCLOSE%}
            className={cn(
              'absolute left-1/2 top-full z-50 mt-1 -translate-x-1/2 whitespace-nowrap',
              'rounded px-2 py-1 text-xs font-medium',
              'bg-slate-800 text-white shadow-lg',
              'dark:bg-slate-200 dark:text-slate-900'
            )}
          >
            {presence.fullName}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
