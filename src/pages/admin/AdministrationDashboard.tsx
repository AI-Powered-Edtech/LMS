import {
  Activity,
  AlertCircle,
  CheckCircle,
  Database,
  FileText,
  GraduationCap,
  Loader2,
  RefreshCw,
  Server,
  Settings,
  Users,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  administrationService,
  SyncHistoryItem,
  SyncResult,
} from '@/features/administration/api/administrationService'
import { FeatureManagement } from '@/features/administration/components/FeatureManagement'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'
import { captureError } from '@/utils/sentry'

// Default sync status for initial state (will be replaced with real data)
const defaultSyncStatus: SyncHistoryItem[] = [
  {
    id: '1',
    type: 'Data Siswa',
    lastSync: new Date().toISOString(),
    status: 'success',
    records: 0,
  },
  {
    id: '2',
    type: 'Data Guru & Staf',
    lastSync: new Date().toISOString(),
    status: 'success',
    records: 0,
  },
  {
    id: '3',
    type: 'Data Kelas & Jadwal',
    lastSync: new Date().toISOString(),
    status: 'warning',
    records: 0,
  },
  {
    id: '4',
    type: 'Nilai & Rapor',
    lastSync: new Date().toISOString(),
    status: 'success',
    records: 0,
  },
  {
    id: '5',
    type: 'Keuangan & SPP',
    lastSync: new Date().toISOString(),
    status: 'success',
    records: 0,
  },
]

export function AdministrationDashboard() {
  const navigate = useNavigate()
  const addToast = useToast((s) => s.addToast)
  usePageTitle('Dasbor Administrasi')

  // State for sync operations
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // State for sync history
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  const [syncHistoryLoading, setSyncHistoryLoading] = useState(true)

  // Fetch sync history on mount
  const fetchSyncHistory = useCallback(async () => {
    try {
      setSyncHistoryLoading(true)
      const data = await administrationService.getSyncHistory()

      if (data.length > 0) {
        setSyncHistory(data)
      } else {
        // Use default sync status when no history available
        setSyncHistory(defaultSyncStatus)
      }
    } catch (error) {
      captureError(error, { context: 'AdministrationDashboard.fetchSyncHistory' })
      if (import.meta.env.DEV) logger.error('Failed to fetch sync history:', error)
      // Use defaults on error
      setSyncHistory(defaultSyncStatus)
    } finally {
      setSyncHistoryLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    void fetchSyncHistory()
  }, [fetchSyncHistory])

  // Sync handler
  const handleSync = async () => {
    setIsSyncing(true)
    setSyncMessage(null)

    try {
      const result: SyncResult = await administrationService.syncExternalSystem()

      if (result.status === 'not_available') {
        setSyncMessage({
          type: 'info',
          text: result.message,
        })
      } else if (result.status === 'success') {
        setSyncMessage({
          type: 'success',
          text: `Sinkronisasi berhasil! ${result.recordsSynced || 0} data diperbarui.`,
        })
        // Refresh sync history
        void fetchSyncHistory()
      } else {
        setSyncMessage({
          type: 'error',
          text: result.errorMessage || 'Sinkronisasi gagal. Silakan coba lagi.',
        })
      }
    } catch (error) {
      captureError(error, { context: 'AdministrationDashboard.triggerSync' })
      if (import.meta.env.DEV) logger.error('Sync failed:', error)
      setSyncMessage({
        type: 'error',
        text: 'Terjadi kesalahan saat sinkronisasi. Silakan coba lagi.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} mnt lalu`
    if (diffHours < 24) return `${diffHours} jam lalu`
    if (diffDays === 1) return 'Kemarin'
    return `${diffDays} hr lalu`
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:px-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Administrasi Terpusat
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Kelola sinkronisasi data PDDIKTI/Dapodik dan konfigurasi sistem sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium border',
              isSyncing
                ? 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
                : syncMessage?.type === 'error'
                  ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/50'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800'
            )}
          >
            {isSyncing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : syncMessage?.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Activity className="w-3.5 h-3.5" />
            )}
            <span>
              {isSyncing
                ? 'Menyinkronkan'
                : syncMessage?.type === 'error'
                  ? 'Gangguan'
                  : 'Sistem Online'}
            </span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm font-medium rounded shadow-sm flex items-center gap-2 hover:bg-slate-800 dark:hover:bg-slate-200 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Memproses...' : 'Sinkronisasi'}
          </button>
        </div>
      </div>

      {/* Sync Message Inline */}
      {syncMessage && (
        <div
          className={cn(
            'px-4 py-3 rounded border text-sm flex items-center gap-3',
            syncMessage.type === 'success' && 'bg-emerald-50/50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20',
            syncMessage.type === 'error' && 'bg-red-50/50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20',
            syncMessage.type === 'info' && 'bg-blue-50/50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20'
          )}
        >
          {syncMessage.type === 'success' && <CheckCircle className="w-4 h-4" />}
          {syncMessage.type === 'error' && <AlertCircle className="w-4 h-4" />}
          {syncMessage.type === 'info' && <Activity className="w-4 h-4" />}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* Grid Status & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* PDDIKTI Status */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Status Integrasi PDDIKTI
            </h2>
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Terhubung
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded overflow-hidden">
            <div className="bg-white dark:bg-slate-950 p-4 flex flex-col justify-between gap-4">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Token API
              </span>
              <span className="font-mono text-sm text-slate-900 dark:text-slate-100 truncate">
                ••••••••••••••••
              </span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-4 flex flex-col justify-between gap-4">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Terakhir Sinkron
              </span>
              <span className="text-sm text-slate-900 dark:text-slate-100">
                {syncHistory.length > 0 ? formatRelativeTime(syncHistory[0].lastSync) : '-'}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-4 flex flex-col justify-between gap-4">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Versi Aplikasi
              </span>
              <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
                v2.4.0
              </span>
            </div>
            <div className="bg-white dark:bg-slate-950 p-4 flex flex-col justify-between gap-4">
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                Status Server
              </span>
              <span className="text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-slate-400" /> 99.9% Uptime
              </span>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">Aksi Cepat</h2>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => navigate('/app/admin/administration')}
              className="w-full px-3 py-2 -mx-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  Konfigurasi Sekolah
                </span>
              </div>
            </button>
            <button
              onClick={() => navigate('/app/admin/users')}
              className="w-full px-3 py-2 -mx-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  Manajemen Akun Staf
                </span>
              </div>
            </button>
            <button
              onClick={() => navigate('/app/admin/audit')}
              className="w-full px-3 py-2 -mx-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  Laporan Log Audit
                </span>
              </div>
            </button>
            <button
              onClick={() =>
                addToast({
                  type: 'warning',
                  message: 'Fitur Cadangan Basis Data dalam pengembangan.',
                })
              }
              className="w-full px-3 py-2 -mx-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded transition-colors flex items-center justify-between group opacity-60"
            >
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                <span className="text-sm text-slate-700 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors">
                  Cadangan Basis Data
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Feature Management */}
      <div className="pt-10">
        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-6">
          Manajemen Fitur
        </h2>
        <FeatureManagement defaultTab="modules" />
      </div>

      {/* Sync History */}
      <div className="pt-10 pb-8">
        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-6">
          Riwayat Sinkronisasi
        </h2>

        {syncHistoryLoading ? (
          <div className="py-8 text-sm text-slate-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Memuat riwayat...
          </div>
        ) : syncHistory.length === 0 ? (
          <div className="py-8 text-sm text-slate-500">Tidak ada riwayat sinkronisasi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="pb-3 font-medium">Jenis Data</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Terakhir Sinkron</th>
                  <th className="pb-3 font-medium text-right">Jumlah Record</th>
                  <th className="pb-3 font-medium w-24 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {syncHistory.map((item) => (
                  <tr
                    key={item.id}
                    className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-3 pr-4 text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2">
                        {item.type === 'Data Siswa' ? (
                          <GraduationCap className="w-4 h-4 text-slate-400" />
                        ) : item.type === 'Data Guru & Staf' ? (
                          <Users className="w-4 h-4 text-slate-400" />
                        ) : (
                          <Database className="w-4 h-4 text-slate-400" />
                        )}
                        <span>{item.type}</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 text-xs font-medium',
                          item.status === 'success'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.status === 'warning'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                        )}
                      >
                        {item.status === 'success' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ) : item.status === 'warning' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        )}
                        {item.status === 'success'
                          ? 'Berhasil'
                          : item.status === 'warning'
                            ? 'Peringatan'
                            : 'Gagal'}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                      {formatRelativeTime(item.lastSync)}
                    </td>
                    <td className="py-3 pr-4 text-slate-500 dark:text-slate-400 text-right font-mono text-xs">
                      {item.records > 0 ? item.records.toLocaleString() : '-'}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all disabled:opacity-50"
                      >
                        Sinkron
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
