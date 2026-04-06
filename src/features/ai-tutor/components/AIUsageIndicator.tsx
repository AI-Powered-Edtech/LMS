import React from 'react'

import { AlertTriangle, Clock, Zap } from 'lucide-react'

import type { AIQuotaInfo } from '../hooks/useAIQuota'

export interface AIUsageIndicatorProps {
  /** Quota information */
  quota: AIQuotaInfo
  /** Optional className */
  className?: string
}

/**
 * AI Usage Indicator Component
 *
 * Shows a progress bar with quota information and warnings
 */
export function AIUsageIndicator({ quota, className = '' }: AIUsageIndicatorProps): React.ReactElement {
  // Determine color based on usage
  const getProgressColor = (): string => {
    if (quota.isExhausted) {
      return 'bg-red-500 dark:bg-red-400'
    }
    if (quota.isApproachingLimit) {
      return 'bg-amber-500 dark:bg-amber-400'
    }
    return 'bg-blue-500 dark:bg-blue-400'
  }

  const getBackgroundColor = (): string => {
    if (quota.isExhausted) {
      return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
    }
    if (quota.isApproachingLimit) {
      return 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800'
    }
    return 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700'
  }

  const getIcon = (): React.ReactNode => {
    if (quota.isExhausted) {
      return <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400" />
    }
    if (quota.isApproachingLimit) {
      return <AlertTriangle className="h-5 w-5 text-amber-500 dark:text-amber-400" />
    }
    return <Zap className="h-5 w-5 text-blue-500 dark:text-blue-400" />
  }

  const getMessage = (): string => {
    if (quota.isExhausted) {
      return 'Kuota AI telah habis. Tunggu hingga reset berikutnya.'
    }
    if (quota.isApproachingLimit) {
      return `Kuota AI hampir habis. Sisa ${quota.remaining} permintaan lagi.`
    }
    return `Kuota AI: ${quota.remaining} dari ${quota.maxUsage} tersisa`
  }

  return (
    <div className={`rounded-lg border p-4 ${getBackgroundColor()} ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        {getIcon()}
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
          Penggunaan AI
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-2">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-2.5 rounded-full transition-all duration-300 ${getProgressColor()}`}
            style={{ width: `${quota.usagePercent}%` }}
            role="progressbar"
            aria-valuenow={quota.usagePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${quota.usagePercent.toFixed(0)}% kuota AI terpakai`}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>{getMessage()}</span>
        {quota.resetsAt && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Reset: {quota.resetsAt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Compact AI Usage Badge
 *
 * Small badge showing remaining quota
 */
export function AIUsageBadge({ quota }: { quota: AIQuotaInfo }): React.ReactElement {
  const getBadgeColor = (): string => {
    if (quota.isExhausted) {
      return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    }
    if (quota.isApproachingLimit) {
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    }
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getBadgeColor()}`}
      title={`${quota.remaining} dari ${quota.maxUsage} tersisa`}
    >
      <Zap className="h-3 w-3" />
      {quota.remaining} tersisa
    </span>
  )
}
