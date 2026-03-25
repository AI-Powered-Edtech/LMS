import { AnimatePresence, motion } from 'motion/react'

import type { PresenceData } from '@/src/features/courses/builder/useBuilderPresence'
import { cn } from '@/src/utils/cn'

interface CollaboratorCursorProps {
  locker: PresenceData
}

export function CollaboratorCursor({ locker }: CollaboratorCursorProps) {
  const initial = locker.fullName?.charAt(0)?.toUpperCase() ?? '?'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="pointer-events-none absolute inset-0 z-10"
      >
        {/* Top colored border */}
        <div
          className="absolute inset-x-0 top-0 h-1 rounded-t"
          style={{ backgroundColor: locker.color }}
        />

        {/* Floating badge at top-right */}
        <div
          className={cn(
            'absolute -top-3 right-2 flex items-center gap-1 rounded-full px-2 py-0.5',
            'shadow-sm',
            'bg-white dark:bg-slate-800'
          )}
          style={{ borderColor: locker.color, borderWidth: 1, borderStyle: 'solid' }}
        >
          {locker.avatarUrl ? (
            <img
              src={locker.avatarUrl}
              alt={locker.fullName}
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                'bg-slate-200 text-slate-600',
                'dark:bg-slate-700 dark:text-slate-300'
              )}
            >
              {initial}
            </span>
          )}
          <span
            className={cn(
              'text-[10px] font-medium leading-none',
              'text-slate-700 dark:text-slate-300'
            )}
          >
            {locker.fullName}
          </span>
        </div>

        {/* Semi-transparent overlay */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center rounded',
            'bg-black/5 dark:bg-white/5'
          )}
        >
          <span
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium',
              'bg-white/90 text-slate-600 shadow-sm',
              'dark:bg-slate-800/90 dark:text-slate-400'
            )}
          >
            Sedang diedit oleh {locker.fullName}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
