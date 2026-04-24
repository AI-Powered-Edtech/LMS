import { CalendarCheck2, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import {
  useAcademicYears,
  useArchiveAcademicYear,
  useCreateAcademicYear,
  useSetActiveAcademicYear,
} from '@/features/academic-years/hooks/useAcademicYears'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'

const STATUS_LABEL: Record<string, string> = {
  planned: 'Direncanakan',
  active: 'Aktif',
  archived: 'Diarsipkan',
}

const STATUS_BADGE: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  archived: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
}

export function AcademicYears() {
  usePageTitle('Tahun Ajaran')
  const { addToast } = useToast()
  const { data: years = [], isLoading } = useAcademicYears()
  const create = useCreateAcademicYear()
  const setActive = useSetActiveAcademicYear()
  const archive = useArchiveAcademicYear()

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!label || !startsOn || !endsOn) return
    try {
      await create.mutateAsync({ label, startsOn, endsOn })
      addToast({ type: 'success', message: `Tahun ajaran ${label} dibuat` })
      setIsCreateOpen(false)
      setLabel('')
      setStartsOn('')
      setEndsOn('')
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Gagal membuat tahun ajaran',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui',
      })
    }
  }

  async function handleSetActive(id: string, yearLabel: string) {
    try {
      await setActive.mutateAsync(id)
      addToast({ type: 'success', message: `Tahun ajaran ${yearLabel} diaktifkan` })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Gagal mengaktifkan tahun ajaran',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui',
      })
    }
  }

  async function handleArchive(id: string, yearLabel: string) {
    if (!window.confirm(`Arsipkan tahun ajaran ${yearLabel}?`)) return
    try {
      await archive.mutateAsync(id)
      addToast({ type: 'success', message: `Tahun ajaran ${yearLabel} diarsipkan` })
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Gagal mengarsipkan tahun ajaran',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan tidak diketahui',
      })
    }
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 px-4 md:px-8 pt-8 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <CalendarCheck2 className="w-6 h-6 text-blue-500" />
            Tahun Ajaran
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Atur tahun ajaran sekolah dan tetapkan satu sebagai aktif. Semester dan rombel akan
            terhubung ke tahun ajaran aktif.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
        >
          Tambah Tahun Ajaran
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat...</div>
        ) : years.length === 0 ? (
          <div className="py-12 text-center">
            <CalendarCheck2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Belum ada tahun ajaran
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tambahkan tahun ajaran pertama untuk mulai mengelola semester dan rombel.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/40">
                <tr>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Periode</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {years.map((year) => (
                  <tr key={year.id}>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {year.label}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {new Date(year.starts_on).toLocaleDateString('id-ID')} —{' '}
                      {new Date(year.ends_on).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[year.status]}`}
                      >
                        {STATUS_LABEL[year.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {year.status !== 'active' && year.status !== 'archived' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetActive(year.id, year.label)}
                          disabled={setActive.isPending}
                        >
                          Aktifkan
                        </Button>
                      )}
                      {year.status === 'active' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleArchive(year.id, year.label)}
                          disabled={archive.isPending}
                        >
                          Arsipkan
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form onSubmit={handleCreate}>
          <ModalHeader title="Tahun Ajaran Baru" onClose={() => setIsCreateOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Label"
                placeholder="Contoh: 2026/2027"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                required
              />
              <Input
                type="date"
                label="Mulai"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
                required
              />
              <Input
                type="date"
                label="Selesai"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
                required
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>
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
