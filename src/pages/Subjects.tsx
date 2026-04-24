import { BookOpen, FolderTree, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'

import {
  useCreateSubject,
  useCurriculumItems,
  useSubjects,
} from '@/features/subjects/hooks/useSubjects'
import { useToast } from '@/hooks/useToast'
import { usePageTitle } from '@/hooks/usePageTitle'

export function Subjects() {
  usePageTitle('Mata Pelajaran & CP/ATP')
  const { addToast } = useToast()
  const { data: subjects = [], isLoading } = useSubjects()
  const createSubject = useCreateSubject()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { data: items = [] } = useCurriculumItems(selectedId)

  const [isOpen, setIsOpen] = useState(false)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [schoolBand, setSchoolBand] = useState<'SD' | 'SMP' | 'SMA'>('SMA')
  const [phase, setPhase] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'F' | ''>('E')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!code || !name) return
    try {
      await createSubject.mutateAsync({
        code,
        name,
        schoolBand,
        phase: phase === '' ? null : phase,
      })
      addToast({ type: 'success', message: `Mata pelajaran ${name} ditambahkan` })
      setIsOpen(false)
      setCode('')
      setName('')
    } catch (err) {
      addToast({
        type: 'error',
        message: 'Gagal menambah mata pelajaran',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      })
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-violet-500" />
            Mata Pelajaran &amp; Capaian Pembelajaran
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Kelola katalog mapel dan struktur CP/ATP Kurmer per fase.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
          Tambah Mapel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
            Daftar Mapel
          </h2>
          {isLoading ? (
            <div className="py-8 text-center text-sm text-slate-500">Memuat...</div>
          ) : subjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Belum ada mata pelajaran.</div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {subjects.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full text-left p-3 rounded-lg ${selectedId === s.id ? 'bg-violet-50 dark:bg-violet-900/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white">{s.name}</p>
                        <p className="text-xs text-slate-500">
                          {s.code} · {s.school_band}
                          {s.is_kurmer_phase ? ` · Fase ${s.is_kurmer_phase}` : ''}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            CP / ATP
          </h2>
          {!selectedId ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Pilih mapel di samping untuk melihat CP/ATP.
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              Belum ada CP/ATP terdaftar untuk mapel ini.
            </div>
          ) : (
            <ul className="space-y-1 text-sm">
              {items.map((it) => (
                <li
                  key={it.id}
                  className={`p-2 rounded ${it.item_type === 'CP' ? 'bg-violet-50 dark:bg-violet-900/10 font-medium' : 'pl-6 text-slate-600 dark:text-slate-400'}`}
                >
                  <span className="text-xs text-slate-500 mr-2">{it.code}</span>
                  {it.title}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form onSubmit={handleCreate}>
          <ModalHeader title="Mata Pelajaran Baru" onClose={() => setIsOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Kode"
                placeholder="MAT-WAJIB"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <Input
                label="Nama"
                placeholder="Matematika Wajib"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <select
                value={schoolBand}
                onChange={(e) => setSchoolBand(e.target.value as 'SD' | 'SMP' | 'SMA')}
              >
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
              <select
                value={phase}
                onChange={(e) => setPhase(e.target.value as typeof phase)}
              >
                <option value="">— tidak ada —</option>
                <option value="A">Fase A (kelas 1-2 SD)</option>
                <option value="B">Fase B (kelas 3-4 SD)</option>
                <option value="C">Fase C (kelas 5-6 SD)</option>
                <option value="D">Fase D (kelas 7-9 SMP)</option>
                <option value="E">Fase E (kelas X SMA)</option>
                <option value="F">Fase F (kelas XI-XII SMA)</option>
              </select>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              Batal
            </Button>
            <Button type="submit" variant="primary" disabled={createSubject.isPending}>
              {createSubject.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
