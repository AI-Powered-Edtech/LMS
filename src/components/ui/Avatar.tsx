import { useState } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { cn } from '@/src/utils/cn'

/* ─── Types ───────────────────────────────────────────────────── */

export interface AvatarProps {
  src?: string
  name: string
  size?: 'sm' | 'md' | 'lg'
  online?: boolean
  className?: string
}

/* ─── Size Variants ───────────────────────────────────────────── */

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
} as const

const indicatorSizes = {
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3 h-3 border-2',
  lg: 'w-3.5 h-3.5 border-2',
} as const

/* ─── Helpers ─────────────────────────────────────────────────── */

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/* ─── Deterministic color from name ───────────────────────────── */

const bgColors = [
  'bg-blue-500 dark:bg-blue-600',
  'bg-emerald-500 dark:bg-emerald-600',
  'bg-amber-500 dark:bg-amber-600',
  'bg-purple-500 dark:bg-purple-600',
  'bg-rose-500 dark:bg-rose-600',
  'bg-cyan-500 dark:bg-cyan-600',
  'bg-orange-500 dark:bg-orange-600',
  'bg-indigo-500 dark:bg-indigo-600',
] as const

function getColorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return bgColors[Math.abs(hash) % bgColors.length]
}

/* ─── Avatar Component ────────────────────────────────────────── */

export function Avatar({ src, name, size = 'md', online, className }: AvatarProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = src && !imgError

  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      {showImage ? (
        <OptimizedImage
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className={cn('rounded-full object-cover', sizeClasses[size])}
        />
      ) : (
        <div
          aria-label={name}
          className={cn(
            'rounded-full flex items-center justify-center font-semibold text-white select-none',
            sizeClasses[size],
            getColorFromName(name)
          )}
        >
          {getInitials(name)}
        </div>
      )}

      {online != null && (
        <span
          aria-label={online ? 'Online' : 'Offline'}
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white dark:border-slate-900',
            online ? 'bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600',
            indicatorSizes[size]
          )}
        />
      )}
    </div>
  )
}
