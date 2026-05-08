import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Lock, Plus } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { useAuth } from '@/contexts/AuthContext'
import { type CounselingCategory,counselingService } from '@/features/counseling/api/counselingService'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useToast } from '@/hooks/useToast'

const CATEGORY_LABEL: Record<CounselingCategory, string> = {
  akademik: 'Akademik',
  pribadi: 'Pribadi',
  sosial: 'Sosial',
  karier: 'Karier',
  pelanggaran: 'Pelanggaran',
  lainnya: 'Lainnya',
}

const CATEGORY_BADGE: Record<CounselingCategory, string> = {
  akademik: 'bg-blue-100 text-blue-800',
  pribadi: 'bg-violet-100 text-violet-800',
  sosial: 'bg-emerald-100 text-emerald-800',
  karier: 'bg-amber-100 text-amber-800',
  pelanggaran: 'bg-red-100 text-red-800',
  lainnya: 'bg-slate-100 text-slate-700',
}

export function Counseling() {
  usePageTitle('Catatan Konseling')
  const { tenantId, user } = useAuth()
  const { addToast } = useToast()
  const qc = useQueryClient()

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['counseling_notes', tenantId],
    queryFn: () => (tenantId ? counselingService.list(tenantId) : Promise.resolve([])),
    enabled: !!tenantId,
  })

  const [isOpen, setIsOpen] = useState(false)
  const [studentId, setStudentId] = useState('')
  const [category, setCategory] = useState<CounselingCategory>('akademik')
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 10))
  const [summary, setSummary] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [isConfidential, setIsConfidential] = useState(true)

  const create = useMutation({
    mutationFn: () =>
      counselingService.create({
        tenantId: tenantId!,
        studentId,
        counselorId: user?.id ?? null,
        sessionDate,
        category,
        summary,
        followUp: followUp || undefined,
        isConfidential,
      }),
    onSuccess: () => {
      addToast({ type: 'success', message: 'Catatan konseling disimpan' })
      setIsOpen(false)
      setStudentId('')
      setSummary('')
      setFollowUp('')
      void qc.invalidateQueries({ queryKey: ['counseling_notes', tenantId] })
    },
    onError: (err) =>
      addToast({
        type: 'error',
        message: 'Gagal menyimpan catatan',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
      }),
  })

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 pt-8 pb-20 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            Catatan Konseling
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Catatan sesi konseling oleh Guru BK. Tandai rahasia kalau berisi data pribadi siswa.
          </p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setIsOpen(true)}>
          Catatan Baru
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-sm text-slate-500">Memuat...</div>
        ) : notes.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Belum ada catatan.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {notes.map((n) => (
              <li key={n.id} className="py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_BADGE[n.category]}`}
                    >
                      {CATEGORY_LABEL[n.category]}
                    </span>
                    {n.is_confidential && (
                      <Lock className="w-3.5 h-3.5 text-slate-400" aria-label="Rahasia" />
                    )}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(n.session_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300">{n.summary}</p>
                {n.follow_up && (
                  <p className="text-xs text-slate-500 mt-2 italic">Tindak lanjut: {n.follow_up}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={isOpen} onClose={() => setIsOpen(false)}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            create.mutate()
          }}
        >
          <ModalHeader title="Catatan Konseling Baru" onClose={() => setIsOpen(false)} />
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Profile ID Siswa"
                placeholder="UUID siswa"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CounselingCategory)}
              >
                {(Object.keys(CATEGORY_LABEL) as CounselingCategory[]).map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                label="Tanggal Sesi"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                required
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Ringkasan
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  required
                  rows={4}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tindak Lanjut (opsional)
                </label>
                <textarea
                  value={followUp}
                  onChange={(e) => setFollowUp(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={isConfidential}
                  onChange={(e) => setIsConfidential(e.target.checked)}
                />
                Tandai sebagai rahasia (hanya Guru BK + Kepsek)
              </label>
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
