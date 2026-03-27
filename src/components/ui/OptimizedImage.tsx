// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { useCallback, useState } from 'react'

import { cn } from '@/src/utils/cn'

import { Skeleton } from './Skeleton'

/* ─── Props ────────────────────────────────────────────────── */

export interface OptimizedImageProps extends Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'alt' | 'width' | 'height' | 'className'
> {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  /** Enable native lazy loading (default: true) */
  lazy?: boolean
  /** Responsive image source set */
  srcSet?: string
  /** Responsive image sizes */
  sizes?: string
}

/* ─── Component ────────────────────────────────────────────── */

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  lazy = true,
  srcSet,
  sizes,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [errorState, setErrorState] = useState(false)

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setLoaded(true)
      onLoad?.(e)
    },
    [onLoad]
  )

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setLoaded(true)
      setErrorState(true)
      onError?.(e)
    },
    [onError]
  )

  // ── Error fallback ──
  if (errorState) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-lg',
          'bg-slate-100 dark:bg-slate-800',
          'text-slate-400 dark:text-slate-500',
          className
        )}
        style={%DOPEN% width: width ?? '100%', height: height ?? 200 %DCLOSE%}
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
      style={%DOPEN% width: width ?? '100%', height: height ?? 'auto' %DCLOSE%}
    >
      {/* Skeleton placeholder while loading */}
      {!loaded && <Skeleton className="absolute inset-0 z-10" width="100%" height="100%" />}

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        srcSet={srcSet}
        sizes={sizes}
        loading={lazy ? 'lazy' : 'eager'}
        decoding="async"
        {...props}
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
