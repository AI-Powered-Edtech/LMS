import { useCallback, useRef, useState } from 'react'

import { cn } from '@/src/utils/cn'

/* ─── Types ───────────────────────────────────────────────────── */

export interface TooltipProps {
  content: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
}

/* ─── Position Styles ─────────────────────────────────────────── */

const positionClasses = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
} as const

const arrowClasses = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 dark:border-t-slate-200 border-x-transparent border-b-transparent border-4',
  bottom:
    'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 dark:border-b-slate-200 border-x-transparent border-t-transparent border-4',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 dark:border-l-slate-200 border-y-transparent border-r-transparent border-4',
  right:
    'right-full top-1/2 -translate-y-1/2 border-r-slate-900 dark:border-r-slate-200 border-y-transparent border-l-transparent border-4',
} as const

/* ─── Tooltip Component ───────────────────────────────────────── */

export function Tooltip({ content, position = 'top', children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 200)
  }, [])

  const hide = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setVisible(false)
  }, [])

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}

      {visible && (
        <div
          role="tooltip"
          className={cn(
            'absolute z-50 px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap pointer-events-none',
            'bg-slate-900 text-white dark:bg-slate-200 dark:text-slate-900',
            'shadow-lg',
            'animate-in fade-in duration-150',
            positionClasses[position]
          )}
        >
          {content}
          <span aria-hidden="true" className={cn('absolute w-0 h-0', arrowClasses[position])} />
        </div>
      )}
    </div>
  )
}
