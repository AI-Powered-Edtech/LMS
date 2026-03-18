import { cn } from '@/src/utils/cn';

/* ─── Base Skeleton ────────────────────────────────────────── */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ width, height, className, style, ...props }: SkeletonProps) {
  return (
    <div
      role="status"
      aria-busy="true"
      className={cn(
        'animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700',
        className
      )}
      style={{ width, height, ...style }}
      {...props}
    />
  );
}

/* ─── SkeletonText ─────────────────────────────────────────── */

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
}

/* ─── SkeletonAvatar ───────────────────────────────────────── */

const avatarSizes = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
} as const;

export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  return (
    <Skeleton className={cn('rounded-full', avatarSizes[size], className)} />
  );
}

/* ─── SkeletonCard ─────────────────────────────────────────── */

export interface SkeletonCardProps {
  className?: string;
  lines?: number;
}

export function SkeletonCard({ className, lines = 2 }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 dark:border-slate-700/60 p-4 sm:p-6 space-y-4',
        className
      )}
    >
      <Skeleton className="h-5 w-2/3" />
      <SkeletonText lines={lines} />
    </div>
  );
}
