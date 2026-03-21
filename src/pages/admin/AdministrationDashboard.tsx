import React, { useState, useEffect, useCallback } from 'react'
import {
  Building2,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Database,
  Server,
  Users,
  GraduationCap,
  FileText,
  Settings,
  Activity,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/src/utils/cn'
import {
  administrationService,
  TenantModuleConfig,
  SyncHistoryItem,
  SyncResult,
} from '@/src/features/administration/api/administrationService'

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
  // State for modules
  const [modules, setModules] = useState<TenantModuleConfig[]>([])
  const [modulesLoading, setModulesLoading] = useState(true)
  const [modulesError, setModulesError] = useState<string | null>(null)

  // State for sync operations
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // State for sync history
  const [syncHistory, setSyncHistory] = useState<SyncHistoryItem[]>([])
  const [syncHistoryLoading, setSyncHistoryLoading] = useState(true)

  // Fetch modules on mount
  const fetchModules = useCallback(async () => {
    try {
      setModulesLoading(true)
      setModulesError(null)

      const data = await administrationService.getTenantModules()

      // If no data from database, use defaults
      if (data.length === 0) {
        setModules(administrationService.getDefaultModules())
      } else {
        setModules(data)
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error)
      setModulesError('Gagal memuat konfigurasi modul. Menggunakan default.')
      // Fallback to defaults on error
      setModules(administrationService.getDefaultModules())
    } finally {
      setModulesLoading(false)
    }
  }, [])

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
      console.error('Failed to fetch sync history:', error)
      // Use defaults on error
      setSyncHistory(defaultSyncStatus)
    } finally {
      setSyncHistoryLoading(false)
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    fetchModules()
    fetchSyncHistory()
  }, [fetchModules, fetchSyncHistory])

  // Toggle module handler
  const handleToggleModule = async (moduleId: string) => {
    const module = modules.find((m) => m.moduleId === moduleId)
    if (!module) return

    const newEnabledState = !module.isEnabled

    // Optimistic update
    setModules((prev) =>
      prev.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled: newEnabledState } : m))
    )

    try {
      await administrationService.toggleTenantModule(moduleId, newEnabledState)
    } catch (error) {
      console.error('Failed to toggle module:', error)
      // Revert on error
      setModules((prev) =>
        prev.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled: !newEnabledState } : m))
      )
    }
  }

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
        fetchSyncHistory()
      } else {
        setSyncMessage({
          type: 'error',
          text: result.errorMessage || 'Sinkronisasi gagal. Silakan coba lagi.',
        })
      }
    } catch (error) {
      console.error('Sync failed:', error)
      setSyncMessage({
        type: 'error',
        text: 'Terjadi kesalahan saat sinkronisasi. Silakan coba lagi.',
      })
    } finally {
      setIsSyncing(false)
    }
  }

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Baru saja'
    if (diffMins < 60) return `${diffMins} menit yang lalu`
    if (diffHours < 24) return `${diffHours} jam yang lalu`
    if (diffDays === 1) return 'Kemarin'
    return `${diffDays} hari yang lalu`
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-8 h-8 text-blue-600" />
            Administrasi Terpusat
          </h1>
          <p className="text-slate-500 mt-1">
            Kelola sinkronisasi data dengan PDDIKTI/Dapodik dan pengaturan sistem sekolah.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">Sistem Online</span>
            <span className="sm:hidden">Online</span>
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl flex items-center gap-2 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
          >
            <RefreshCw className={cn('w-4 h-4', isSyncing && 'animate-spin')} />
            {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Data'}
          </button>
        </div>
      </div>

      {/* Sync Message Toast */}
      {syncMessage && (
        <div
          className={cn(
            'p-4 rounded-xl border flex items-center gap-3',
            syncMessage.type === 'success' && 'bg-green-50 text-green-700 border-green-200',
            syncMessage.type === 'error' && 'bg-red-50 text-red-700 border-red-200',
            syncMessage.type === 'info' && 'bg-blue-50 text-blue-700 border-blue-200'
          )}
        >
          {syncMessage.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {syncMessage.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {syncMessage.type === 'info' && <Activity className="w-5 h-5" />}
          <span className="font-medium">{syncMessage.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Module Configuration Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-3">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Konfigurasi Modul & Fitur</h3>
              <p className="text-sm text-slate-500">
                Aktifkan atau nonaktifkan fitur sesuai kebutuhan sekolah.
              </p>
            </div>
          </div>

          {/* Error State for Modules */}
          {modulesError && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-200 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {modulesError}
            </div>
          )}

          {/* Loading State */}
          {modulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              <span className="ml-3 text-slate-500">Memuat modul...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => (
                <div
                  key={module.moduleId}
                  className="flex items-start justify-between p-4 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex-1 pr-4">
                    <h4 className="font-bold text-slate-900 text-sm mb-1">{module.name}</h4>
                    <p className="text-xs text-slate-500 mb-2">{module.description}</p>
                    <div className="flex gap-1 flex-wrap">
                      {module.targetRoles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded"
                        >
                          {role === 'teacher' ? 'Guru' : 'Siswa'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleModule(module.moduleId)}
                    className={cn(
                      'shrink-0 transition-colors',
                      module.isEnabled ? 'text-blue-600' : 'text-slate-400'
                    )}
                  >
                    {module.isEnabled ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!modulesLoading && modules.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-slate-300" />
              <p>Tidak ada modul tersedia.</p>
            </div>
          )}
        </div>

        {/* PDDIKTI Status Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Status Integrasi PDDIKTI</h3>
                <p className="text-sm text-slate-500">Terhubung ke server pusat Kemendikbud</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold border border-green-200 uppercase tracking-wider">
              Terhubung
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Token API
              </p>
              <p className="font-mono text-slate-900 truncate">••••••••••••••••</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Terakhir Sinkronisasi
              </p>
              <p className="font-medium text-slate-900">
                {syncHistory.length > 0 ? formatRelativeTime(syncHistory[0].lastSync) : '-'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Versi Aplikasi
              </p>
              <p className="font-medium text-slate-900">v2.4.0 (Build 20260301)</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Server Status
              </p>
              <p className="font-medium text-green-600 flex items-center gap-2">
                <Server className="w-4 h-4" /> Operational (99.9% Uptime)
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Konfigurasi Sekolah</span>
            </button>
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <Users className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Manajemen Akun Staf</span>
            </button>
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Laporan Audit Log</span>
            </button>
            <button className="w-full p-3 text-left bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-3">
              <Database className="w-5 h-5 text-slate-500" />
              <span className="font-medium text-slate-700 text-sm">Backup Database</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sync History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">Riwayat Sinkronisasi Data</h3>
        </div>

        {/* Loading State for Sync History */}
        {syncHistoryLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <span className="ml-3 text-slate-500">Memuat riwayat...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Jenis Data</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Terakhir Sinkronisasi</th>
                  <th className="px-6 py-4">Jumlah Record</th>
                  <th className="px-6 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syncHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-bold text-slate-900 flex items-center gap-2">
                      {item.type === 'Data Siswa' ? (
                        <GraduationCap className="w-4 h-4 text-blue-500" />
                      ) : item.type === 'Data Guru & Staf' ? (
                        <Users className="w-4 h-4 text-purple-500" />
                      ) : (
                        <Database className="w-4 h-4 text-slate-500" />
                      )}
                      {item.type}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-xs font-bold border flex items-center w-fit gap-1',
                          item.status === 'success'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : item.status === 'warning'
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-red-50 text-red-700 border-red-200'
                        )}
                      >
                        {item.status === 'success' ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {item.status === 'success'
                          ? 'Berhasil'
                          : item.status === 'warning'
                            ? 'Peringatan'
                            : 'Gagal'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatRelativeTime(item.lastSync)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {item.records > 0 ? item.records.toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs disabled:opacity-50"
                      >
                        Sync Now
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Empty State for Sync History */}
        {!syncHistoryLoading && syncHistory.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Database className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p>Tidak ada riwayat sinkronisasi.</p>
          </div>
        )}
      </div>
    </div>
  )
}
