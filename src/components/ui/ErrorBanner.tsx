import { AlertCircle, X } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/utils/cn'

export interface ErrorBannerProps {
  message: string
  title?: string
  variant?: 'banner' | 'inline'
  onDismiss?: () => void
  className?: string
}

export function ErrorBanner({
  message,
  title,
  variant = 'banner',
  onDismiss,
  className,
}: ErrorBannerProps) {
  const [visible, setVisible] = useState(true)

  if (!visible) return null

  const handleDismiss = () => {
    setVisible(false)
    onDismiss?.()
  }

  const isInline = variant === 'inline'

  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-lg',
        isInline
          ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-3 py-2.5'
          : 'bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3',
        className
      )}
    >
      <AlertCircle
        className={cn(
          'shrink-0 mt-0.5',
          isInline ? 'w-4 h-4' : 'w-5 h-5',
          'text-red-500 dark:text-red-400'
        )}
      />
      <div className="flex-1 min-w-0">
        {title && (
          <p
            className={cn(
              'font-semibold text-red-800 dark:text-red-200',
              isInline ? 'text-sm' : 'text-base'
            )}
          >
            {title}
          </p>
        )}
        <p className={cn('text-red-700 dark:text-red-300', isInline ? 'text-sm' : 'text-sm')}>
          {message}
        </p>
      </div>
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-md text-red-400 hover:text-red-600 dark:hover:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
          aria-label="Tutup"
        >
          <X size={isInline ? 14 : 16} />
        </button>
      )}
    </div>
  )
}
