import { cn } from '@/src/utils/cn'

/* ─── Types ───────────────────────────────────────────────────── */

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/* ─── Size Variants ───────────────────────────────────────────── */

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const

/* ─── Spinner Component ───────────────────────────────────────── */

export function Spinner({ size = 'md', className }: SpinnerProps) {
  return (
    <svg
      className={cn('animate-spin', sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Memuat..."
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
