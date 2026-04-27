import { GraduationCap, Plus, Users } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useActiveAcademicYear } from '@/features/academic-years/hooks/useAcademicYears'
import {
  useCreateRombel,
  useRombelList,
  useRombelMembers,
} from '@/features/rombel/hooks/useRombel'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'

export function RombelManagement() {
  usePageTitle('Manajemen Rombel')
  const { addToast } = useToast()
  const { data: activeYear } = useActiveAcademicYear()
  const { data: rombels = [], isLoading } = useRombelList(activeYear?.id ?? null)
  const create = useCreateRombel()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: members = [] } = useRombelMembers(selectedId)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('36')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name) return
    try {
      await create.mutateAsync({
        academicYearId: activeYear?.id ?? null,
        gradeLevelId: null,
        code,
        name,
        waliKelasId: null,
        capacity: Number.parseInt(capacity, 10) || 36,
      })
      addToast({ type: 'success', message: `Rombel ${code} dibuat` })
      setIsCreateOpen(false)
      setCode('')
      setName('')
      setCapacity('36')
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Gagal membuat rombel',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      })
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-emerald-500" />
            Manajemen Rombel
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeYear
              ? `Tahun ajaran aktif: ${activeYear.label}`
              : 'Belum ada tahun ajaran aktif. Tetapkan tahun aktif terlebih dahulu di menu Tahun Ajaran.'}
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateOpen(true)}
          disabled={!activeYear}
        >
          Tambah Rombel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Daftar Rombel
          </h2>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Memuat...</div>
          ) : rombels.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Belum ada rombel.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {rombels.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedId === r.id
                        ? 'bg-emerald-50 dark:bg-emerald-900/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{r.name}</p>
                        <p className="text-xs text-slate-500">
                          {r.code} · kapasitas {r.capacity}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {r.status === 'active' ? 'Aktif' : 'Diarsipkan'}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Anggota Rombel
          </h2>
          {!selectedId ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Pilih rombel di samping untuk melihat anggota.
            </div>
          ) : members.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Belum ada anggota.</div>
          ) : (
            <p className="text-sm text-slate-700 dark:text-slate-300">
              {members.length} siswa terdaftar.
            </p>
          )}
        </Card>
      </div>

      <Modal open={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form onSubmit={handleCreate}>
          <ModalHeader title="Rombel Baru" onClose={() => setIsCreateOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Kode Rombel"
                placeholder="Contoh: X-IPA-1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <Input
                label="Nama Tampilan"
                placeholder="Contoh: X IPA 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="number"
                label="Kapasitas"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                min={1}
                max={100}
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
