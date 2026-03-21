import { useState, useCallback } from 'react'
import { cn } from '@/src/utils/cn'
import { Skeleton } from './Skeleton'

/* ─── Props ────────────────────────────────────────────────── */

export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  /** Enable native lazy loading (default: true) */
  lazy?: boolean
}

/* ─── Component ────────────────────────────────────────────── */

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  const handleLoad = useCallback(() => setLoaded(true), [])
  const handleError = useCallback(() => {
    setLoaded(true)
    setError(true)
  }, [])

  // ── Error fallback ──
  if (error) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-400 dark:text-slate-500',
          className
        )}
        style={{ width: width ?? '100%', height: height ?? 200 }}
        role="img"
        aria-label={alt}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={48}
          height={48}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect width={18} height={18} x={3} y={3} rx={2} ry={2} />
          <circle cx={9} cy={9} r={2} />
          <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
        </svg>
      </div>
    )
  }

  return (
    <div
      className={cn('relative overflow-hidden', className)}
      style={{ width: width ?? '100%', height: height ?? 'auto' }}
    >
      {/* Skeleton placeholder while loading */}
      {!loaded && <Skeleton className="absolute inset-0 z-10" width="100%" height="100%" />}

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
      />
    </div>
  )
}
