import { GitBranch, Plus, RefreshCw } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'

import { useAuth } from '@/contexts/AuthContext'
import { ppdbAdminService } from '@/features/ppdb/api/ppdbAdminService'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export function PpdbJalur() {
  usePageTitle('PPDB — Jalur Pendaftaran')
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: periods = [] } = useQuery({
    queryKey: ['ppdb_periods', tenantId],
    queryFn: () => (tenantId ? ppdbAdminService.listPeriods(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  })
  const [periodId, setPeriodId] = useState<string>('')
  const { data: jalurList = [] } = useQuery({
    queryKey: ['ppdb_jalur', tenantId, periodId],
    queryFn: () =>
      tenantId && periodId ? ppdbAdminService.listJalur(tenantId, periodId) : Promise.resolve([]),
    enabled: !!tenantId && !!periodId,
  })

  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState('zonasi')
  const [label, setLabel] = useState('')
  const [quota, setQuota] = useState('30')

  const create = useMutation({
    mutationFn: () =>
      ppdbAdminService.createJalur({
        tenantId: tenantId!,
        periodId,
        code,
        label,
        quota: Number.parseInt(quota, 10) || 0,
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: `Jalur ${label} ditambahkan` })
      setIsOpen(false)
      setLabel('')
      void qc.invalidateQueries({ queryKey: ['ppdb_jalur', tenantId, periodId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal menambah jalur',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  const refresh = useMutation({
    mutationFn: () => ppdbAdminService.refreshRanks(periodId),
    onSuccess: (count) =>
      addToast({ type: 'success', message: `Ranking diperbarui (${count} pendaftar)` }),
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal memperbarui ranking',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GitBranch className="w-6 h-6 text-rose-500" />
            PPDB — Jalur Pendaftaran
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Atur jalur (zonasi, afirmasi, prestasi, mutasi) dan kuota per periode.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={() => refresh.mutate()}
            disabled={!periodId || refresh.isPending}
          >
            Refresh Ranking
          </Button>
          <Button
            variant="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsOpen(true)}
            disabled={!periodId}
          >
            Tambah Jalur
          </Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-4">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Periode:</label>
          <select value={periodId} onChange={(e) => setPeriodId(e.target.value)} className="w-72">
            <option value="">— pilih periode —</option>
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {!periodId ? (
          <div className="py-12 text-center text-sm text-slate-500">
            Pilih periode untuk melihat jalur.
          </div>
        ) : jalurList.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Belum ada jalur.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3">Kode</th>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3 text-right">Kuota</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {jalurList.map((j) => (
                  <tr key={j.id}>
                    <td className="px-4 py-3 font-mono text-xs">{j.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{j.label}</td>
                    <td className="px-4 py-3 text-right font-medium">{j.quota}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <ModalHeader title="Jalur PPDB Baru" onClose={() => setIsOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <select value={code} onChange={(e) => setCode(e.target.value)}>
                <option value="zonasi">Zonasi</option>
                <option value="afirmasi">Afirmasi</option>
                <option value="prestasi">Prestasi</option>
                <option value="mutasi">Mutasi</option>
              </select>
              <Input
                label="Nama Tampilan"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
              <Input
                type="number"
                label="Kuota"
                value={quota}
                onChange={(e) => setQuota(e.target.value)}
                min={0}
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={create.isPending}>
              {create.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
