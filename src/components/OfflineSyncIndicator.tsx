/**
 * OfflineSyncIndicator — Shows sync status and pending operations
 *
 * This component displays:
 * - Current online/offline status
 * - Number of pending sync operations
 * - Sync progress indicator
 * - Conflict resolution UI
 * - Manual sync trigger
 */

import { AlertTriangle, CheckCircle, RefreshCw, Wifi, WifiOff, XCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { useNetworkStatus } from '@/hooks/useNetworkStatus'
import { useToast } from '@/hooks/useToast'

import { type ConflictInfo, resolveConflict } from '../utils/conflictResolver'
import {
  getPendingOperations,
  getQueueStats,
  type ReplayQueueItem,
  type ReplayQueueStats,
} from '../utils/ReplayQueue'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OfflineSyncIndicatorProps {
  /** Whether to show detailed stats (default: false for compact mode) */
  detailed?: boolean
  /** Custom sync function to trigger manual sync */
  onSync?: () => Promise<void>
  /** Position class for positioning (default: fixed bottom-right) */
  position?: 'fixed-bottom-right' | 'fixed-top-right' | 'inline'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OfflineSyncIndicator({
  detailed = false,
  onSync,
  position = 'fixed-bottom-right',
}: OfflineSyncIndicatorProps) {
  const { isOnline } = useNetworkStatus()
  const { addToast } = useToast()

  const [stats, setStats] = useState<ReplayQueueStats>({
    pending: 0,
    syncing: 0,
    completed: 0,
    failed: 0,
    conflict: 0,
    total: 0,
  })

  const [pendingOps, setPendingOps] = useState<ReplayQueueItem[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [activeConflict, setActiveConflict] = useState<ConflictInfo | null>(null)

  const handleSync = useCallback(async () => {
    if (isSyncing || !isOnline) return

    setIsSyncing(true)

    try {
      if (onSync) {
        await onSync()
      } else {
        // Default sync logic — would integrate with backgroundSync.ts
        // This is a placeholder for the actual sync implementation
        console.warn('[OfflineSyncIndicator] Sync triggered')
      }

      addToast({
        type: 'success',
        message: 'Sinkronisasi Berhasil',
        description: `${stats.pending} operasi berhasil disinkronkan.`,
      })
    } catch {
      addToast({
        type: 'error',
        message: 'Sinkronisasi Gagal',
        description: 'Beberapa operasi gagal disinkronkan. Periksa detail.',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing, isOnline, stats.pending, onSync, addToast])

  // Refresh stats every 2 seconds when online
  useEffect(() => {
    const updateStats = async () => {
      try {
        const [queueStats, pending] = await Promise.all([getQueueStats(), getPendingOperations()])
        setStats(queueStats)
        setPendingOps(pending)

        // Show toast if there are conflicts
        if (queueStats.conflict !== undefined && queueStats.conflict > 0 > 0 && !activeConflict) {
          addToast({
            type: 'warning',
            message: 'Sinkronisasi Konflik',
            description: `${queueStats.conflict !== undefined && queueStats.conflict > 0} konflik memerlukan resolusi Anda.`,
          })
        }
      } catch (error) {
        console.error('[OfflineSyncIndicator] Failed to update stats:', error)
      }
    }

    void updateStats()

    if (isOnline) {
      const interval = setInterval(updateStats, 2000)
      return () => clearInterval(interval)
    }
  }, [isOnline, activeConflict, addToast])

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && stats.pending > 0 && !isSyncing) {
      void handleSync()
    }
  }, [isOnline, stats.pending, isSyncing])

  const _handleResolveConflict = useCallback(
    async (itemId: string) => {
      // Find the operation with conflict
      const item = pendingOps.find((op) => op.id === itemId)
      if (!item || !(item.payload as Record<string, unknown>).conflict) return

      const conflict = (item.payload as Record<string, unknown>).conflict as ConflictInfo

      try {
        // Auto-resolve using strategy
        const resolution = await resolveConflict(conflict, conflict.entityType)

        if (resolution.strategy === 'manual-merge') {
          // Show conflict resolution UI
          setActiveConflict(conflict)
        } else {
          // Apply resolution automatically
          // This would call the appropriate API to apply resolved data
          console.warn('[OfflineSyncIndicator] Conflict resolved:', resolution.strategy)

          addToast({
            type: 'info',
            message: 'Konflik Terselesaikan',
            description: `Strategi: ${resolution.strategy}`,
          })
        }
      } catch {
        addToast({
          type: 'error',
          message: 'Resolusi Konflik Gagal',
          description: 'Tidak dapat menyelesaikan konflik.',
        })
      }
    },
    [pendingOps, addToast]
  )

  // Position classes
  const positionClasses = {
    'fixed-bottom-right': 'fixed bottom-4 right-4 z-50',
    'fixed-top-right': 'fixed top-4 right-4 z-50',
    inline: 'relative',
  }

  // Compact mode — just show status icon
  if (!detailed && !showDetails) {
    return (
      <div className={positionClasses[position]}>
        <button
          onClick={() => setShowDetails(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow"
          title={isOnline ? 'Online' : 'Offline'}
        >
          {isOnline ? (
            stats.pending > 0 ? (
              <>
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {stats.pending}
                </span>
              </>
            ) : (
              <Wifi className="w-4 h-4 text-green-600" />
            )
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-gray-500" />
              {stats.pending > 0 && (
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {stats.pending}
                </span>
              )}
            </>
          )}
        </button>
      </div>
    )
  }

  // Detailed mode — show full sync panel
  return (
    <div className={positionClasses[position]}>
      <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-500" />
              )}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Status Sinkronisasi
              </h3>
            </div>
            <button
              onClick={() => setShowDetails(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Menunggu:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">{stats.pending}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Disinkronkan:</span>
            <span className="font-medium text-green-600">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              {stats.completed}
            </span>
          </div>
          {stats.failed > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Gagal:</span>
              <span className="font-medium text-red-600">
                <XCircle className="w-4 h-4 inline mr-1" />
                {stats.failed}
              </span>
            </div>
          )}
          {stats.conflict !== undefined && stats.conflict > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Konflik:</span>
              <span className="font-medium text-yellow-600">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                {stats.conflict}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <button
            onClick={handleSync}
            disabled={!isOnline || isSyncing || stats.pending === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-md transition-colors text-sm font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}
          </button>

          {stats.conflict !== undefined && stats.conflict > 0 && (
            <button
              onClick={() => {
                // Find first conflict and show it
                const conflictItem = pendingOps.find((op) => op.status === 'conflict')
                if ((conflictItem?.payload as Record<string, unknown>)?.conflict) {
                  setActiveConflict(
                    (conflictItem?.payload as Record<string, unknown>)?.conflict as ConflictInfo
                  )
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md transition-colors text-sm font-medium"
            >
              <AlertTriangle className="w-4 h-4" />
              Selesaikan Konflik
            </button>
          )}
        </div>

        {/* Pending Operations List */}
        {pendingOps.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
              Operasi Menunggu
            </h4>
            <div className="space-y-2">
              {pendingOps.slice(0, 5).map((op) => (
                <div key={op.id} className="p-2 bg-gray-50 dark:bg-gray-900 rounded-md text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{op.type}</span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {new Date(
                        (op.metadata as Record<string, string>)?.queuedAt
                      ).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-gray-600 dark:text-gray-400 mt-1">
                    {(op.metadata as Record<string, string>)?.entityId}
                  </div>
                  {(op.metadata as Record<string, string>)?.lastError && (
                    <div className="text-red-600 mt-1">
                      {(op.metadata as Record<string, string>)?.lastError}
                    </div>
                  )}
                </div>
              ))}
              {pendingOps.length > 5 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  +{pendingOps.length - 5} operasi lainnya
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conflict Resolution Modal */}
      {activeConflict && (
        <ConflictResolutionModal
          conflict={activeConflict}
          onClose={() => setActiveConflict(null)}
          onResolve={async (strategy) => {
            const resolution = await resolveConflict(
              activeConflict,
              activeConflict.entityType,
              strategy
            )
            // Apply resolution...
            setActiveConflict(null)
            addToast({
              type: 'success',
              message: 'Konflik Terselesaikan',
              description: `Strategi: ${resolution.strategy}`,
            })
          }}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conflict Resolution Modal
// ---------------------------------------------------------------------------

interface ConflictResolutionModalProps {
  conflict: ConflictInfo
  onClose: () => void
  onResolve: (strategy: 'local' | 'server' | 'merge') => Promise<void>
}

function ConflictResolutionModal({ conflict, onClose, onResolve }: ConflictResolutionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Resolusi Konflik
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Versi lokal dan server berbeda untuk {conflict.entityType} ini.
          </p>
        </div>

        {/* Conflict Details */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          <div className="grid grid-cols-2 gap-4">
            {/* Local Version */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Versi Lokal
              </h3>
              <pre className="text-xs text-blue-800 dark:text-blue-200 overflow-auto">
                {JSON.stringify(conflict.localData, null, 2)}
              </pre>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                Diperbarui: {new Date(conflict.localVersion).toLocaleString()}
              </div>
            </div>

            {/* Server Version */}
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                Versi Server
              </h3>
              <pre className="text-xs text-green-800 dark:text-green-200 overflow-auto">
                {JSON.stringify(conflict.serverData, null, 2)}
              </pre>
              <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                Diperbarui: {new Date(conflict.serverVersion).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-2">
          <button
            onClick={() => onResolve('local')}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors text-sm font-medium"
          >
            Gunakan Versi Lokal
          </button>
          <button
            onClick={() => onResolve('server')}
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors text-sm font-medium"
          >
            Gunakan Versi Server
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-md transition-colors text-sm font-medium"
          >
            Nanti
          </button>
        </div>
      </div>
    </div>
  )
}
