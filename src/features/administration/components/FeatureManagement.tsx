/**
 * FeatureManagement.tsx — Unified feature management component.
 *
 * Menggabungkan dua fitur:
 * - Tab "Modul Sekolah": Toggle on/off per modul (dari AdministrationDashboard)
 * - Tab "Fitur Lanjutan": Feature flags dengan rollout percentage (dari FeatureFlagsPage)
 */

import {
  AlertCircle,
  Flag,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Save,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { EmptyState } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import {
  administrationService,
  type TenantModuleConfig,
} from '@/features/administration/api/administrationService'
import { featureFlagService } from '@/features/administration/api/featureFlagService'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { captureError } from '@/utils/sentry'
import { type FeatureFlag } from '@/utils/featureFlags'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabId = 'modules' | 'flags'

interface FlagDraft extends FeatureFlag {
  dirty: boolean
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface FeatureManagementProps {
  /** Tab yang aktif saat mount. Default: 'modules' */
  defaultTab?: TabId
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FeatureManagement({ defaultTab = 'modules' }: FeatureManagementProps) {
  const addToast = useToast((s) => s.addToast)
  const { tenantId } = useAuth()

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab)

  // ── Module state ──────────────────────────────────────────────────────────
  const [modules, setModules] = useState<TenantModuleConfig[]>([])
  const [modulesLoading, setModulesLoading] = useState(true)
  const [modulesError, setModulesError] = useState<string | null>(null)

  // ── Feature flags state ───────────────────────────────────────────────────
  const [flags, setFlags] = useState<FlagDraft[]>([])
  const [flagsLoading, setFlagsLoading] = useState(false)
  const [flagsError, setFlagsError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // ── Fetch modules ─────────────────────────────────────────────────────────
  const fetchModules = useCallback(async () => {
    setModulesLoading(true)
    setModulesError(null)
    try {
      const data = await administrationService.getTenantModules()
      setModules(data.length > 0 ? data : administrationService.getDefaultModules())
    } catch (error) {
      captureError(error, { context: 'FeatureManagement.fetchModules' })
      setModulesError('Gagal memuat konfigurasi modul. Menggunakan default.')
      setModules(administrationService.getDefaultModules())
    } finally {
      setModulesLoading(false)
    }
  }, [])

  // ── Fetch flags ───────────────────────────────────────────────────────────
  const fetchFlags = useCallback(async () => {
    if (!tenantId) return
    setFlagsLoading(true)
    setFlagsError(null)
    try {
      const data = await featureFlagService.fetchFlags(tenantId)
      setFlags(data.map((f: FeatureFlag) => ({ ...f, dirty: false })))
    } catch (error) {
      captureError(error, { context: 'FeatureManagement.fetchFlags' })
      setFlagsError('Gagal memuat fitur flags. Coba muat ulang halaman.')
    } finally {
      setFlagsLoading(false)
    }
  }, [tenantId])

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchModules()
  }, [fetchModules])

  // Load flags lazily when tab is first opened
  useEffect(() => {
    if (activeTab === 'flags' && flags.length === 0 && !flagsLoading) {
      fetchFlags()
    }
  }, [activeTab, flags.length, flagsLoading, fetchFlags])

  // ── Module handlers ───────────────────────────────────────────────────────
  const handleToggleModule = async (moduleId: string) => {
    const mod = modules.find((m) => m.moduleId === moduleId)
    if (!mod) return
    const newEnabled = !mod.isEnabled

    // Optimistic update
    setModules((prev) =>
      prev.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled: newEnabled } : m))
    )

    try {
      await administrationService.toggleTenantModule(moduleId, newEnabled)
    } catch (error) {
      captureError(error, { context: 'FeatureManagement.toggleModule' })
      // Revert on error
      setModules((prev) =>
        prev.map((m) => (m.moduleId === moduleId ? { ...m, isEnabled: !newEnabled } : m))
      )
      addToast({ type: 'error', message: 'Gagal mengubah status modul. Silakan coba lagi.' })
    }
  }

  // ── Flag handlers ─────────────────────────────────────────────────────────
  const toggleFlagEnabled = (flagName: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.flag_name === flagName ? { ...f, enabled: !f.enabled, dirty: true } : f))
    )
  }

  const setFlagRollout = (flagName: string, value: number) => {
    setFlags((prev) =>
      prev.map((f) =>
        f.flag_name === flagName
          ? { ...f, rollout_percentage: Math.min(100, Math.max(0, value)), dirty: true }
          : f
      )
    )
  }

  const handleSaveFlags = async () => {
    const dirty = flags.filter((f) => f.dirty)
    if (dirty.length === 0 || !tenantId) return

    setSaving(true)
    setFlagsError(null)
    setSaveSuccess(false)

    try {
      await featureFlagService.saveFlags(
        tenantId,
        dirty.map((f) => ({
          flag_name: f.flag_name,
          enabled: f.enabled,
          rollout_percentage: f.rollout_percentage,
        }))
      )
      setFlags((prev) => prev.map((f) => ({ ...f, dirty: false })))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      addToast({ type: 'success', message: 'Perubahan fitur berhasil disimpan.' })
    } catch (error) {
      captureError(error, { context: 'FeatureManagement.saveFlags' })
      setFlagsError('Gagal menyimpan perubahan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const hasDirtyFlags = flags.some((f) => f.dirty)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center">
          <LayoutGrid className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            Manajemen Fitur
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Kelola modul sekolah dan fitur lanjutan dalam satu tempat.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab('modules')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            activeTab === 'modules'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          )}
        >
          <LayoutGrid className="w-4 h-4" />
          Modul Sekolah
        </button>
        <button
          onClick={() => setActiveTab('flags')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
            activeTab === 'flags'
              ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-sm'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
          )}
        >
          <Flag className="w-4 h-4" />
          Fitur Lanjutan
        </button>
      </div>

      {/* ── Tab: Modul Sekolah ─────────────────────────────────────────────── */}
      {activeTab === 'modules' && (
        <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl border border-neutral-200 dark:border-neutral-700 shadow-sm p-6">
          {/* Error state */}
          {modulesError && (
            <div className="mb-4 p-3 bg-warning-50 dark:bg-warning-900/20 text-warning-700 dark:text-warning-400 rounded-lg border border-warning-200 dark:border-warning-800 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {modulesError}
            </div>
          )}

          {/* Loading state */}
          {modulesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              <span className="ml-3 text-neutral-500 dark:text-neutral-400">Memuat modul...</span>
            </div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
              <LayoutGrid className="w-12 h-12 mx-auto mb-3 text-neutral-300" />
              <p>Tidak ada modul tersedia.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {modules.map((module) => (
                <div
                  key={module.moduleId}
                  className="flex items-start justify-between p-4 bg-white dark:bg-neutral-700/50 rounded-xl border border-neutral-200 dark:border-neutral-600 transition-colors"
                >
                  <div className="flex-1 pr-3 min-w-0">
                    <h4
                      className="font-bold text-neutral-900 dark:text-neutral-100 text-sm mb-1 line-clamp-2 break-words"
                      title={module.name}
                    >
                      {module.name}
                    </h4>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2 line-clamp-2">
                      {module.description}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {module.isCore && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 rounded">
                          Inti
                        </span>
                      )}
                      {module.targetRoles.map((role) => (
                        <span
                          key={role}
                          className="text-[10px] uppercase font-bold px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-600 text-neutral-600 dark:text-neutral-300 rounded"
                        >
                          {role === 'teacher' ? 'Guru' : 'Siswa'}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    role="switch"
                    aria-checked={module.isEnabled}
                    aria-label={`${module.isEnabled ? 'Nonaktifkan' : 'Aktifkan'} modul ${module.name}`}
                    onClick={() => handleToggleModule(module.moduleId)}
                    disabled={module.isCore}
                    className={cn(
                      'shrink-0 transition-colors',
                      module.isCore && 'opacity-50 cursor-not-allowed',
                      !module.isCore &&
                        (module.isEnabled
                          ? 'text-primary-600 dark:text-primary-400'
                          : 'text-neutral-400 dark:text-neutral-600')
                    )}
                    title={module.isCore ? 'Modul inti tidak dapat dinonaktifkan' : undefined}
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
        </div>
      )}

      {/* ── Tab: Fitur Lanjutan ────────────────────────────────────────────── */}
      {activeTab === 'flags' && (
        <div className="space-y-4">
          {/* Action bar */}
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Aktifkan atau nonaktifkan fitur per tenant dengan kontrol rollout bertahap.
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={fetchFlags}
                disabled={flagsLoading}
                aria-label="Muat ulang"
                className={cn(
                  'p-2 rounded-lg text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100',
                  'dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800',
                  'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  flagsLoading && 'animate-spin'
                )}
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSaveFlags}
                disabled={!hasDirtyFlags || saving}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
                  'focus-visible:ring-2 focus-visible:ring-primary-500 outline-none',
                  hasDirtyFlags && !saving
                    ? 'bg-primary-600 text-white hover:bg-primary-700'
                    : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-600 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Perubahan
              </button>
            </div>
          </div>

          {/* Success banner */}
          {saveSuccess && (
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
              Perubahan berhasil disimpan.
            </div>
          )}

          {/* Error banner */}
          {flagsError && (
            <div className="flex items-center gap-2 px-4 py-3 bg-danger-50 dark:bg-danger-950/50 border border-danger-200 dark:border-danger-800 rounded-xl text-sm text-danger-700 dark:text-danger-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {flagsError}
            </div>
          )}

          {/* Content */}
          {flagsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-14 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : flags.length === 0 ? (
            <EmptyState
              title="Belum ada fitur flags"
              description="Tambahkan baris ke tabel feature_flags di database untuk mulai mengonfigurasi fitur."
            />
          ) : (
            <div className="rounded-2xl border border-neutral-200 dark:border-neutral-700/60 overflow-hidden">
              <table className="w-full text-sm" aria-label="Daftar fitur flags">
                <thead>
                  <tr className="bg-neutral-50 dark:bg-neutral-800/60 text-left">
                    <th className="px-5 py-3 font-semibold text-neutral-600 dark:text-neutral-300">
                      Nama Fitur
                    </th>
                    <th className="px-5 py-3 font-semibold text-neutral-600 dark:text-neutral-300 text-center">
                      Status
                    </th>
                    <th className="px-5 py-3 font-semibold text-neutral-600 dark:text-neutral-300 text-center">
                      Rollout (%)
                    </th>
                    <th className="px-5 py-3 font-semibold text-neutral-600 dark:text-neutral-300 text-center">
                      Override Tenant
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {flags.map((flag) => (
                    <tr
                      key={flag.flag_name}
                      className={cn(
                        'bg-neutral-50 dark:bg-neutral-900 transition-colors',
                        flag.dirty && 'bg-primary-50/40 dark:bg-primary-950/20'
                      )}
                    >
                      {/* Flag name */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-800 dark:text-neutral-200">
                            {flag.flag_name}
                          </span>
                          {flag.dirty && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300 rounded-full">
                              diubah
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Toggle */}
                      <td className="px-5 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleFlagEnabled(flag.flag_name)}
                          aria-label={flag.enabled ? 'Nonaktifkan fitur' : 'Aktifkan fitur'}
                          className="inline-flex items-center gap-1.5 transition-colors"
                        >
                          {flag.enabled ? (
                            <>
                              <ToggleRight className="w-6 h-6 text-green-500" />
                              <span className="text-xs font-semibold text-green-600 dark:text-green-400">
                                Aktif
                              </span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-6 h-6 text-neutral-400" />
                              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                                Nonaktif
                              </span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Rollout % */}
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={flag.rollout_percentage}
                            onChange={(e) => setFlagRollout(flag.flag_name, Number(e.target.value))}
                            className={cn(
                              'w-16 px-2 py-1 text-center text-sm rounded-lg border',
                              'border-neutral-200 dark:border-neutral-700',
                              'bg-neutral-50 dark:bg-neutral-800',
                              'text-neutral-800 dark:text-neutral-200',
                              'outline-none focus:ring-2 focus:ring-primary-500'
                            )}
                          />
                          <span className="text-neutral-500 dark:text-neutral-400">%</span>
                        </div>
                      </td>

                      {/* Tenant override count */}
                      <td className="px-5 py-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                            flag.tenant_ids?.length > 0
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : 'bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500'
                          )}
                        >
                          {flag.tenant_ids?.length ?? 0} tenant
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Sticky save bar (shown when there are dirty flags) */}
          {hasDirtyFlags && (
            <div className="sticky bottom-4 flex items-center justify-between gap-4 px-5 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 rounded-2xl shadow-xl border border-neutral-700 dark:border-neutral-300">
              <span className="text-sm font-medium">
                {flags.filter((f) => f.dirty).length} perubahan belum disimpan
              </span>
              <button
                type="button"
                onClick={handleSaveFlags}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                  'bg-primary-600 text-white hover:bg-primary-700',
                  saving && 'opacity-70 cursor-not-allowed'
                )}
              >
                {saving ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Sekarang
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
