import { Check, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useBuilder } from '@/contexts/BuilderContext'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { useApplyOutline, useGenerateOutline } from '../queries/aiBuilderCopilotQueries'
import { useBuilderAICopilotStore } from '../store/builderAICopilot.store'
import type { OutlineModule } from '../types'
import { CopilotLoadingState } from './shared/CopilotLoadingState'
import { ModuleOutlineCard } from './shared/ModuleOutlineCard'

export function OutlineTab() {
  const { state, actions } = useBuilder()
  const addToast = useToast((s) => s.addToast)

  const generateOutline = useGenerateOutline()
  const applyOutline = useApplyOutline()
  const hydratedArtifact = useBuilderAICopilotStore((s) => s.hydratedArtifact)

  // Form state
  const [subject, setSubject] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [moduleCount, setModuleCount] = useState(4)
  const [lessonCount, setLessonCount] = useState(3)

  // Preview state
  const [modules, setModules] = useState<OutlineModule[]>([])
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (!hydratedArtifact || hydratedArtifact.artifact_kind !== 'outline') return

    const hydratedModules = Array.isArray(hydratedArtifact.output.modules)
      ? (hydratedArtifact.output.modules as OutlineModule[])
      : []

    setModules(hydratedModules)
    setArtifactId(hydratedArtifact.id)
    setSelectedModules(new Set(hydratedModules.map((_, index) => index)))
  }, [hydratedArtifact])

  const handleGenerate = async () => {
    if (!state.courseId) return

    try {
      const result = await generateOutline.mutateAsync({
        course_id: state.courseId,
        course_title: state.courseTitle,
        course_description: state.courseDescription ?? undefined,
        subject: subject || undefined,
        grade_level: gradeLevel || undefined,
        target_module_count: moduleCount,
        target_lesson_count: lessonCount,
      })

      setModules(result.outline.modules)
      setArtifactId(result.artifact_id)
      setSelectedModules(new Set(result.outline.modules.map((_, i) => i)))
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menghasilkan kerangka.',
      })
    }
  }

  const handleApply = async () => {
    if (!artifactId || !state.courseId || selectedModules.size === 0) return

    const selected = modules.filter((_, i) => selectedModules.has(i))

    try {
      await applyOutline.mutateAsync({
        artifactId,
        courseId: state.courseId,
        selectedModules: selected,
      })

      // Refresh the builder sidebar
      actions.loadCourse(state.courseId)

      addToast({
        type: 'success',
        message: `${selected.length} modul berhasil ditambahkan ke kursus.`,
      })

      // Reset preview
      setModules([])
      setArtifactId(null)
      setSelectedModules(new Set())
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menerapkan kerangka.',
      })
    }
  }

  const toggleModule = (index: number) => {
    setSelectedModules((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedModules.size === modules.length) {
      setSelectedModules(new Set())
    } else {
      setSelectedModules(new Set(modules.map((_, i) => i)))
    }
  }

  if (generateOutline.isPending) {
    return <CopilotLoadingState message="Menghasilkan kerangka kursus..." />
  }

  // Preview mode
  if (modules.length > 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Pratinjau Kerangka
            </h3>
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {selectedModules.size === modules.length ? 'Hapus Semua' : 'Pilih Semua'}
            </button>
          </div>

          {modules.map((mod, i) => (
            <ModuleOutlineCard
              key={i}
              module={mod}
              index={i}
              selected={selectedModules.has(i)}
              onToggle={() => toggleModule(i)}
            />
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <button
            onClick={handleApply}
            disabled={selectedModules.size === 0 || applyOutline.isPending}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {applyOutline.isPending ? 'Menerapkan...' : `Terapkan ${selectedModules.size} Modul`}
          </button>
          <button
            onClick={() => {
              setModules([])
              setArtifactId(null)
            }}
            className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Buat Ulang
          </button>
        </div>
      </div>
    )
  }

  // Form mode
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hasilkan kerangka kursus lengkap dengan modul dan pelajaran berdasarkan judul dan
          deskripsi kursus Anda.
        </p>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Mata Pelajaran
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Contoh: Matematika, IPA, Bahasa Indonesia"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Tingkat/Kelas
          </label>
          <input
            type="text"
            value={gradeLevel}
            onChange={(e) => setGradeLevel(e.target.value)}
            placeholder="Contoh: SMP Kelas 8, SMA Kelas 10"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Jumlah Modul
            </label>
            <input
              type="number"
              min={1}
              max={10}
              value={moduleCount}
              onChange={(e) => setModuleCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              Pelajaran/Modul
            </label>
            <input
              type="number"
              min={1}
              max={8}
              value={lessonCount}
              onChange={(e) => setLessonCount(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <button
          onClick={handleGenerate}
          disabled={!state.courseId || !state.courseTitle}
          className={cn(
            'w-full py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2',
            'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Sparkles className="w-4 h-4" />
          Hasilkan Kerangka
        </button>
      </div>
    </div>
  )
}
