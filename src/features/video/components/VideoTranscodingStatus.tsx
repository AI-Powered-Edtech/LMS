/**
 * Video Transcoding Status Component
 *
 * Displays the current status of video transcoding with:
 * - Progress bar (0-100%)
 * - Status indicators (pending, processing, completed, failed)
 * - Estimated time remaining
 * - Retry button on failure
 * - HLS ready indicator
 */

import { AlertCircle, CheckCircle2, Clock, Loader2, RotateCcw, Video } from 'lucide-react'

import { cn } from '@/utils/cn'

interface VideoTranscodingStatusProps {
  progress: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
  onRetry?: () => void
  className?: string
}

const STATUS_CONFIG = {
  pending: {
    label: 'Menunggu antrian...',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    icon: Clock,
    showProgress: false,
  },
  processing: {
    label: 'Memproses video...',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    icon: Loader2,
    showProgress: true,
  },
  completed: {
    label: 'Video siap diputar!',
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    icon: CheckCircle2,
    showProgress: false,
  },
  failed: {
    label: 'Transcoding gagal',
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    icon: AlertCircle,
    showProgress: false,
  },
}

export function VideoTranscodingStatus({
  progress,
  status,
  errorMessage,
  onRetry,
  className,
}: VideoTranscodingStatusProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status Header */}
      <div className="flex items-center gap-3">
        <div className={cn('shrink-0', config.color)}>
          <Icon className={cn('w-5 h-5', status === 'processing' && 'animate-spin')} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>

          {config.showProgress && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{progress}% selesai</p>
          )}
        </div>

        {/* Retry Button */}
        {status === 'failed' && onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Coba Lagi
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {config.showProgress && (
        <div className="relative w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              'absolute top-0 left-0 h-full transition-all duration-500 ease-out rounded-full',
              config.bgColor
            )}
            style={{ width: `${progress}%` }}
          />

          {/* Animated shimmer effect */}
          {status === 'processing' && (
            <div className="absolute inset-0 overflow-hidden">
              <div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                style={{
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 2s infinite',
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {status === 'failed' && errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Completed Info */}
      {status === 'completed' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <Video className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
          <p className="text-xs text-green-700 dark:text-green-300">
            Video telah ditranscode ke format HLS dan siap untuk streaming adaptif
          </p>
        </div>
      )}
    </div>
  )
}

export default VideoTranscodingStatus
