import { AlertCircle, Flag, RefreshCw, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { EmptyState } from '@/src/components/ui'
import { useAuth } from '@/src/contexts/AuthContext'
import { AdministrationSkeleton } from '@/src/features/administration/components/AdministrationSkeleton'
import { featureFlagService } from '@/src/features/administration/api/featureFlagService'
import { usePageTitle } from '@/src/hooks/usePageTitle'
import { cn } from '@/src/utils/cn'
import { FeatureFlag } from '@/src/utils/featureFlags'

// ---------------------------------------------------------------------------
// Local draft state extends FeatureFlag with a dirty flag
// ---------------------------------------------------------------------------

interface FlagDraft extends FeatureFlag {
  dirty: boolean
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeatureFlagsPage() {
  usePageTitle('Pengaturan Fitur')
  const { tenantId, role } = useAuth()
  const [flags, setFlags] = useState<FlagDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const fetchFlags = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const data = await featureFlagService.fetchFlags(tenantId)
      setFlags(data.map((f: FeatureFlag) => ({ ...f, dirty: false })))
    } catch {
      setError('Gagal memuat fitur flags. Coba muat ulang halaman.')
    }
    setLoading(false)
  }, [tenantId])

  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  // SECURITY: RBAC check — only admin can access this page
  if (role !== 'admin') {
    return (
      <div className="p-6 max-w-5xl mx-auto text-center">
        <p className="text-red-600 font-bold">
          Akses ditolak. Hanya admin yang dapat mengakses halaman ini.
        </p>
      </div>
    )
  }

  const toggleEnabled = (flagName: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.flag_name === flagName ? { ...f, enabled: !f.enabled, dirty: true } : f))
    )
  }

  const setRollout = (flagName: string, value: number) => {
    setFlags((prev) =>
      prev.map((f) =>
        f.flag_name === flagName
          ? { ...f, rollout_percentage: Math.min(100, Math.max(0, value)), dirty: true }
          : f
      )
    )
  }

  const handleSave = async () => {
    const dirty = flags.filter((f) => f.dirty)
    if (dirty.length === 0) return

    setSaving(true)
    setError(null)
    setSaveSuccess(false)

    try {
      await featureFlagService.saveFlags(
        tenantId!,
        dirty.map((f) => ({
          flag_name: f.flag_name,
          enabled: f.enabled,
          rollout_percentage: f.rollout_percentage,
        }))
      )

      setFlags((prev) => prev.map((f) => ({ ...f, dirty: false })))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setError('Gagal menyimpan perubahan. Coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  const hasDirty = flags.some((f) => f.dirty)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading && flags.length === 0) {
    return <AdministrationSkeleton />
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
            <Flag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pengaturan Fitur</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Aktifkan atau nonaktifkan fitur per tenant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchFlags}
            disabled={loading}
            aria-label="Muat ulang"
            className={cn(
              'p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100',
              'dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800',
              'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
              loading && 'animate-spin'
            )}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={!hasDirty || saving}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all',
              'focus-visible:ring-2 focus-visible:ring-blue-500 outline-none',
              hasDirty && !saving
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed'
            )}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Simpan perubahan
          </button>
        </div>
      </div>

      {/* Success banner */}
      {saveSuccess && (
        <div className="flex items-center gap-2 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-sm text-emerald-700 dark:text-emerald-300">
          Perubahan berhasil disimpan.
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : flags.length === 0 ? (
        <EmptyState
          title="Belum ada fitur flags"
          description="Tambahkan baris ke tabel feature_flags di database untuk mulai mengonfigurasi fitur."
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden">
          <table className="w-full text-sm" aria-label="Daftar fitur flags">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-left">
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300">
                  Nama Fitur
                </th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300 text-center">
                  Status
                </th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300 text-center">
                  Rollout (%)
                </th>
                <th className="px-5 py-3 font-semibold text-slate-600 dark:text-slate-300 text-center">
                  Tenant Override
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {flags.map((flag) => (
                <tr
                  key={flag.flag_name}
                  className={cn(
                    'bg-white dark:bg-slate-900 transition-colors',
                    flag.dirty && 'bg-blue-50/40 dark:bg-blue-950/20'
                  )}
                >
                  {/* Flag name */}
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {flag.flag_name}
                      </span>
                      {flag.dirty && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">
                          diubah
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Toggle */}
                  <td className="px-5 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => toggleEnabled(flag.flag_name)}
                      aria-label={flag.enabled ? 'Nonaktifkan fitur' : 'Aktifkan fitur'}
                      className="inline-flex items-center gap-1.5 transition-colors"
                    >
                      {flag.enabled ? (
                        <>
                          <ToggleRight className="w-6 h-6 text-emerald-500" />
                          <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Aktif
                          </span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
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
                        onChange={(e) => setRollout(flag.flag_name, Number(e.target.value))}
                        className={cn(
                          'w-16 px-2 py-1 text-center text-sm rounded-lg border',
                          'border-slate-200 dark:border-slate-700',
                          'bg-white dark:bg-slate-800',
                          'text-slate-800 dark:text-slate-200',
                          'outline-none focus:ring-2 focus:ring-blue-500'
                        )}
                      />
                      <span className="text-slate-500 dark:text-slate-400">%</span>
                    </div>
                  </td>

                  {/* Tenant override count */}
                  <td className="px-5 py-3 text-center">
                    <span
                      className={cn(
                        'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold',
                        flag.tenant_ids?.length > 0
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
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
    </div>
  )
}
