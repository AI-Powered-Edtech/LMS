/**
 * Skeleton Loading Components
 *
 * Standardized skeleton components for consistent loading states across the app.
 * Provides shimmer animation and accessible loading indicators.
 *
 * Usage:
 * ```tsx
 * <CardSkeleton />
 * <TableSkeleton rows={5} />
 * <ChartSkeleton height={300} />
 * <VideoPlayerSkeleton />
 * ```
 */

import { cn } from '@/utils/cn'

// ─── Base Skeleton Block ─────────────────────────────────────────────────────

interface SkeletonBlockProps {
  className?: string
  width?: string
  height?: string
  rounded?: string
  animate?: boolean
}

export function SkeletonBlock({
  className,
  width = 'w-full',
  height = 'h-4',
  rounded = 'rounded-md',
  animate = true,
}: SkeletonBlockProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        'bg-slate-200 dark:bg-slate-700',
        width,
        height,
        rounded,
        animate && 'animate-pulse',
        className
      )}
    />
  )
}

// ─── Card Skeleton ────────────────────────────────────────────────────────────

interface CardSkeletonProps {
  className?: string
  showHeader?: boolean
  showFooter?: boolean
  lines?: number
}

export function CardSkeleton({
  className,
  showHeader = true,
  showFooter = false,
  lines = 3,
}: CardSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading card content"
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3',
        className
      )}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center gap-3">
          <SkeletonBlock width="w-10" height="h-10" rounded="rounded-full" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock width="w-3/4" height="h-4" />
            <SkeletonBlock width="w-1/2" height="h-3" />
          </div>
        </div>
      )}

      {/* Content Lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock key={i} width={i === lines - 1 ? 'w-2/3' : 'w-full'} height="h-3" />
      ))}

      {/* Footer */}
      {showFooter && (
        <div className="flex gap-2 pt-2">
          <SkeletonBlock width="w-20" height="h-8" rounded="rounded-lg" />
          <SkeletonBlock width="w-20" height="h-8" rounded="rounded-lg" />
        </div>
      )}
    </div>
  )
}

// ─── Table Skeleton ───────────────────────────────────────────────────────────

interface TableSkeletonProps {
  className?: string
  rows?: number
  columns?: number
  showHeader?: boolean
}

export function TableSkeleton({
  className,
  rows = 5,
  columns = 4,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading table content"
      className={cn('bg-white dark:bg-slate-800 rounded-xl overflow-hidden', className)}
    >
      {/* Table Header */}
      {showHeader && (
        <div className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <SkeletonBlock key={i} width={i === 0 ? 'w-32' : 'w-24'} height="h-4" />
            ))}
          </div>
        </div>
      )}

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="border-b border-slate-100 dark:border-slate-700 px-4 py-3">
          <div className="flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonBlock
                key={colIndex}
                width={colIndex === 0 ? 'w-32' : colIndex === columns - 1 ? 'w-16' : 'w-24'}
                height="h-3"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Chart Skeleton ──────────────────────────────────────────────────────────

interface ChartSkeletonProps {
  className?: string
  height?: number
  showTitle?: boolean
  showLegend?: boolean
}

export function ChartSkeleton({
  className,
  height = 300,
  showTitle = true,
  showLegend = true,
}: ChartSkeletonProps) {
  return (
    <div
      role="status"
      aria-label="Loading chart"
      className={cn(
        'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4',
        className
      )}
    >
      {/* Title */}
      {showTitle && (
        <div className="mb-4">
          <SkeletonBlock width="w-48" height="h-5" />
          <SkeletonBlock width="w-32" height="h-3" className="mt-2" />
        </div>
      )}

      {/* Chart Area */}
      <div
        className="relative bg-slate-50 dark:bg-slate-700/30 rounded-lg"
        style={{ height: `${height}px` }}
      >
        {/* Grid Lines */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="absolute left-0 right-0 border-t border-slate-200 dark:border-slate-600"
            style={{ top: `${(i + 1) * 20}%` }}
          />
        ))}

        {/* Placeholder Bars/Lines */}
        <div className="absolute inset-0 flex items-end justify-around px-8 pb-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonBlock
              key={i}
              width="w-8"
              height={`h-${Math.random() > 0.5 ? '32' : '24'}`}
              rounded="rounded-t-md"
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="flex gap-4 mt-4 justify-center">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkeletonBlock width="w-3" height="h-3" rounded="rounded-sm" />
              <SkeletonBlock width="w-16" height="h-3" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Video Player Skeleton ────────────────────────────────────────────────────

interface VideoPlayerSkeletonProps {
  className?: string
  aspectRatio?: 'video' | 'square' | 'portrait'
  showControls?: boolean
  showTitle?: boolean
}

export function VideoPlayerSkeleton({
  className,
  aspectRatio = 'video',
  showControls = true,
  showTitle = true,
}: VideoPlayerSkeletonProps) {
  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'square'
        ? 'aspect-square'
        : 'aspect-[9/16]'

  return (
    <div className={cn('space-y-3', className)}>
      {/* Title */}
      {showTitle && (
        <div>
          <SkeletonBlock width="w-3/4" height="h-5" />
          <SkeletonBlock width="w-1/2" height="h-3" className="mt-2" />
        </div>
      )}

      {/* Video Player */}
      <div
        role="status"
        aria-label="Loading video player"
        className={cn(
          'relative bg-slate-900 dark:bg-slate-950 rounded-xl overflow-hidden',
          aspectClass
        )}
      >
        {/* Play Button Placeholder */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/20 animate-pulse" />
        </div>

        {/* Progress Bar */}
        {showControls && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <SkeletonBlock width="w-full" height="h-1" className="mb-3 bg-white/30" />
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <SkeletonBlock width="w-6" height="h-6" rounded="rounded" />
                <SkeletonBlock width="w-6" height="h-6" rounded="rounded" />
              </div>
              <SkeletonBlock width="w-20" height="h-4" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── List Skeleton ────────────────────────────────────────────────────────────

interface ListSkeletonProps {
  className?: string
  items?: number
  showAvatar?: boolean
  showDescription?: boolean
}

export function ListSkeleton({
  className,
  items = 5,
  showAvatar = true,
  showDescription = true,
}: ListSkeletonProps) {
  return (
    <div role="status" aria-label="Loading list" className={cn('space-y-3', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
        >
          {showAvatar && <SkeletonBlock width="w-10" height="h-10" rounded="rounded-full" />}
          <div className="flex-1 space-y-2">
            <SkeletonBlock width="w-3/4" height="h-4" />
            {showDescription && <SkeletonBlock width="w-1/2" height="h-3" />}
          </div>
        </div>
      ))}
    </div>
  )
}

export default {
  Block: SkeletonBlock,
  Card: CardSkeleton,
  Table: TableSkeleton,
  Chart: ChartSkeleton,
  VideoPlayer: VideoPlayerSkeleton,
  List: ListSkeleton,
}
