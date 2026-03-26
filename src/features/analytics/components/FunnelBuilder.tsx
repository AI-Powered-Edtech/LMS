import { useState } from 'react'
import { Plus, X, Save } from 'lucide-react'
import { useSaveFunnel } from '../queries/analyticsQueries'

const ALL_EVENT_TYPES = [
  'LESSON_STARTED',
  'LESSON_COMPLETED',
  'BLOCK_VIEWED',
  'VIDEO_PROGRESS',
  'QUIZ_STARTED',
  'QUIZ_SUBMITTED',
  'ASSIGNMENT_SUBMITTED',
  'FILE_DOWNLOADED',
] as const

const EVENT_LABELS: Record<string, string> = {
  LESSON_STARTED: 'Mulai Pelajaran',
  LESSON_COMPLETED: 'Selesai Pelajaran',
  BLOCK_VIEWED: 'Lihat Konten',
  VIDEO_PROGRESS: 'Tonton Video',
  QUIZ_STARTED: 'Mulai Kuis',
  QUIZ_SUBMITTED: 'Kumpul Kuis',
  ASSIGNMENT_SUBMITTED: 'Kumpul Tugas',
  FILE_DOWNLOADED: 'Unduh File',
}

interface FunnelBuilderProps {
  courseId?: string
  onSaved?: (funnelId: string) => void
  onCancel?: () => void
}

export function FunnelBuilder({ courseId, onSaved, onCancel }: FunnelBuilderProps) {
  const [name, setName] = useState('')
  const [steps, setSteps] = useState<string[]>(['LESSON_STARTED', 'QUIZ_SUBMITTED'])
  const saveFunnel = useSaveFunnel()

  const addStep = () => {
    const unused = ALL_EVENT_TYPES.find((e) => !steps.includes(e))
    if (unused) setSteps((prev) => [...prev, unused])
  }

  const removeStep = (i: number) => setSteps((prev) => prev.filter((_, idx) => idx !== i))

  const changeStep = (i: number, value: string) => {
    setSteps((prev) => prev.map((s, idx) => (idx === i ? value : s)))
  }

  const handleSave = async () => {
    if (!name.trim() || steps.length < 2) return
    const id = await saveFunnel.mutateAsync({ name: name.trim(), steps, courseId })
    onSaved?.(id)
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">
          Nama Funnel
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="cth. Perjalanan Kuis"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
          Langkah-Langkah ({steps.length})
        </label>
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
              {i + 1}
            </span>
            <select
              value={step}
              onChange={(e) => changeStep(i, e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            >
              {ALL_EVENT_TYPES.map((et) => (
                <option key={et} value={et}>
                  {EVENT_LABELS[et]}
                </option>
              ))}
            </select>
            {steps.length > 2 && (
              <button onClick={() => removeStep(i)} className="text-slate-400 hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {steps.length < 6 && (
          <button
            onClick={addStep}
            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Langkah
          </button>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Batal
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!name.trim() || steps.length < 2 || saveFunnel.isPending}
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" />
          {saveFunnel.isPending ? 'Menyimpan...' : 'Simpan Funnel'}
        </button>
      </div>
    </div>
  )
}
