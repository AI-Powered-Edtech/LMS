import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { useActiveAcademicYear } from '@/features/academic-years/hooks/useAcademicYears'
import { p5Service } from '@/features/p5/api/p5Service'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'

const STATUS_LABEL: Record<string, string> = {
  planned: 'Direncanakan',
  active: 'Berjalan',
  completed: 'Selesai',
  archived: 'Diarsipkan',
}

export function P5Projects() {
  usePageTitle('Projek P5')
  const { tenantId } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()
  const { data: activeYear } = useActiveAcademicYear()

  const { data: themes = [] } = useQuery({
    queryKey: ['p5_themes'],
    queryFn: () => p5Service.listThemes(),
  })
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['p5_projects', tenantId, activeYear?.id],
    queryFn: () =>
      tenantId ? p5Service.listProjects(tenantId, activeYear?.id) : Promise.resolve([]),
    enabled: !!tenantId,
  })

  const [isOpen, setIsOpen] = useState(false)
  const [themeId, setThemeId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startsOn, setStartsOn] = useState('')
  const [endsOn, setEndsOn] = useState('')

  const create = useMutation({
    mutationFn: () =>
      p5Service.createProject({
        tenantId: tenantId!,
        academicYearId: activeYear?.id ?? null,
        themeId: themeId || null,
        title,
        description,
        startsOn: startsOn || null,
        endsOn: endsOn || null,
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: `Projek ${title} dibuat` })
      setIsOpen(false)
      setTitle('')
      setDescription('')
      void qc.invalidateQueries({ queryKey: ['p5_projects', tenantId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal membuat projek',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  return (
    <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            Projek P5 — Penguatan Profil Pelajar Pancasila
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Projek lintas mapel dengan asesmen peer + self + fasilitator.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
          Tambah Projek
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat...</div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Belum ada projek P5.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((p) => {
              const theme = themes.find((t) => t.id === p.theme_id)
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">{p.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'completed'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  {theme && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 mb-2">
                      Tema: {theme.label}
                    </p>
                  )}
                  {p.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400">{p.description}</p>
                  )}
                </div>
              )
            })}
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
          <ModalHeader title="Projek P5 Baru" onClose={() => setIsOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <select value={themeId} onChange={(e) => setThemeId(e.target.value)}>
                <option value="">— pilih tema —</option>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              <Input label="Judul Projek" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <Input
                label="Deskripsi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Mulai"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
                <Input
                  type="date"
                  label="Selesai"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </div>
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
