import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plug, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useAuth } from '@/contexts/AuthContext'
import { dapodikCsvExport } from '@/features/exports/api/dapodikCsvExport'
import { integrationService } from '@/features/integrations/api/integrationService'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'

interface IntegrationDef {
  key: string
  label: string
  description: string
}

const KNOWN_INTEGRATIONS: IntegrationDef[] = [
  { key: 'midtrans', label: 'Midtrans', description: 'Pembayaran SPP & PPDB (snap, VA, e-wallet).' },
  { key: 'whatsapp', label: 'WhatsApp BSP', description: 'Notifikasi orang tua via Twilio / Infobip.' },
  { key: 'email', label: 'Email', description: 'SMTP / SES / Sendgrid untuk pengingat & rapor digital.' },
  { key: 'dapodik', label: 'Dapodik Export', description: 'CSV one-way export untuk sinkronisasi Dapodik.' },
  { key: 'bank_va_bca', label: 'Bank VA — BCA', description: 'Direct integration BCA (alternatif Midtrans).' },
]

export function Integrations() {
  usePageTitle('Integrasi & Sinkronisasi')
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: configs = [] } = useQuery({
    queryKey: ['integration_configs', tenantId],
    queryFn: () => (tenantId ? integrationService.list(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  })
  const { data: dapodikJobs = [] } = useQuery({
    queryKey: ['dapodik_jobs', tenantId],
    queryFn: () => (tenantId ? integrationService.listDapodikJobs(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  })

  const [scope, setScope] = useState<'students' | 'staff' | 'rombel' | 'all'>('students')

  const toggle = useMutation({
    mutationFn: ({ integration, enabled }: { integration: string; enabled: boolean }) =>
      integrationService.upsert({
        tenantId: tenantId!,
        integration,
        isEnabled: enabled,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['integration_configs', tenantId] })
      addToast({ type: 'success', message: 'Konfigurasi diperbarui' })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal memperbarui',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  const triggerDapodik = useMutation({
    mutationFn: () =>
      integrationService.createDapodikJob({
        tenantId: tenantId!,
        scope,
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: `Job ekspor Dapodik (${scope}) dibuat` })
      void qc.invalidateQueries({ queryKey: ['dapodik_jobs', tenantId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal membuat job ekspor',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  function getEnabled(key: string): boolean {
    return configs.find((c) => c.integration === key)?.is_enabled ?? false
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Plug className="w-6 h-6 text-purple-500" />
          Integrasi &amp; Sinkronisasi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Aktifkan provider eksternal. Kredensial / API key diatur sebagai env var di server.
        </p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          Provider
        </h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {KNOWN_INTEGRATIONS.map((def) => {
            const enabled = getEnabled(def.key)
            return (
              <li key={def.key} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{def.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{def.description}</p>
                </div>
                <Button
                  variant={enabled ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => toggle.mutate({ integration: def.key, enabled: !enabled })}
                  disabled={toggle.isPending}
                >
                  {enabled ? 'Nonaktifkan' : 'Aktifkan'}
                </Button>
              </li>
            )
          })}
        </ul>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dapodik — Ekspor CSV
          </h2>
          <div className="flex items-center gap-2">
            <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              <option value="students">Siswa</option>
              <option value="staff">Staf</option>
              <option value="rombel">Rombel</option>
              <option value="all">Semua</option>
            </select>
            <Button
              variant="ghost"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={async () => {
                if (!tenantId) return
                try {
                  if (scope === 'students') await dapodikCsvExport.exportStudents(tenantId)
                  else if (scope === 'staff') await dapodikCsvExport.exportStaff(tenantId)
                  else if (scope === 'rombel') await dapodikCsvExport.exportRombel(tenantId)
                  else {
                    await dapodikCsvExport.exportStudents(tenantId)
                    await dapodikCsvExport.exportStaff(tenantId)
                    await dapodikCsvExport.exportRombel(tenantId)
                  }
                  addToast({ type: 'success', message: 'CSV diunduh' })
                } catch (err) {
                  addToast({
                    type: 'error',
                    message: 'Ekspor langsung gagal',
                    description: err instanceof Error ? err.message : 'Terjadi kesalahan',
                  })
                }
              }}
            >
              Unduh CSV (langsung)
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => triggerDapodik.mutate()}
              disabled={triggerDapodik.isPending}
            >
              Buat Job Ekspor
            </Button>
          </div>
        </div>

        {dapodikJobs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Belum ada job ekspor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-2">Tanggal</th>
                  <th className="px-4 py-2">Lingkup</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Baris</th>
                  <th className="px-4 py-2">File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dapodikJobs.map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(j.created_at).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-2">{j.export_scope}</td>
                    <td className="px-4 py-2">
                      {j.status === 'completed' ? (
                        <span className="text-emerald-600">Selesai</span>
                      ) : j.status === 'failed' ? (
                        <span className="text-red-600">Gagal</span>
                      ) : (
                        <span className="text-amber-600 inline-flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {j.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">{j.row_count ?? '—'}</td>
                    <td className="px-4 py-2">
                      {j.file_url ? (
                        <a
                          href={j.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                          aria-label="Unduh CSV"
                        >
                          Unduh
                          <span className="sr-only">(buka di tab baru)</span>
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
