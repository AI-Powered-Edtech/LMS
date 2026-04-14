import { Check, FileText, HelpCircle, PenTool, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useBuilder } from '@/contexts/BuilderContext'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { useApplyLessonDraft, useGenerateLessonDraft } from '../queries/aiBuilderCopilotQueries'
import { useBuilderAICopilotStore } from '../store/builderAICopilot.store'
import type { AssignmentDraftPayload, LessonDraftBlock, QuizDraftPayload } from '../types'
import { BlockPreviewCard } from './shared/BlockPreviewCard'
import { CopilotLoadingState } from './shared/CopilotLoadingState'

type AssessmentMode = 'quiz' | 'reading' | 'writing'

const MODES: Array<{
  value: AssessmentMode
  label: string
  desc: string
  icon: typeof HelpCircle
}> = [
  { value: 'quiz', label: 'Kuis', desc: 'Soal pilihan ganda siap pakai', icon: HelpCircle },
  { value: 'reading', label: 'Bacaan', desc: 'Blok teks bacaan untuk lesson', icon: FileText },
  { value: 'writing', label: 'Tugas', desc: 'Brief tugas menulis/esai', icon: PenTool },
]

function resolveModeFromArtifact(
  artifact: { output: Record<string, unknown> } | null
): AssessmentMode | null {
  if (!artifact) return null

  const explicitMode = artifact.output.mode
  if (explicitMode === 'quiz' || explicitMode === 'reading' || explicitMode === 'writing') {
    return explicitMode
  }

  if (artifact.output.quiz_payload && typeof artifact.output.quiz_payload === 'object') {
    return 'quiz'
  }

  if (
    artifact.output.assignment_payload &&
    typeof artifact.output.assignment_payload === 'object'
  ) {
    return 'writing'
  }

  if (Array.isArray(artifact.output.blocks)) {
    return 'reading'
  }

  return null
}

export function AssessmentTab() {
  const { state, actions } = useBuilder()
  const addToast = useToast((s) => s.addToast)
  const hydratedArtifact = useBuilderAICopilotStore((s) => s.hydratedArtifact)
  const generateAssessment = useGenerateLessonDraft()
  const applyDraft = useApplyLessonDraft()

  const [mode, setMode] = useState<AssessmentMode>('quiz')
  const [artifactId, setArtifactId] = useState<string | null>(null)
  const [blocks, setBlocks] = useState<LessonDraftBlock[]>([])
  const [selectedBlocks, setSelectedBlocks] = useState<Set<number>>(new Set())
  const [quizPayload, setQuizPayload] = useState<QuizDraftPayload | null>(null)
  const [assignmentPayload, setAssignmentPayload] = useState<AssignmentDraftPayload | null>(null)

  const activeLessonTitle = useMemo(
    () =>
      state.modules
        .flatMap((module) => module.lessons)
        .find((lesson) => lesson.id === state.activeLesson?.id)?.title ?? '',
    [state.modules, state.activeLesson?.id]
  )

  useEffect(() => {
    if (!hydratedArtifact || hydratedArtifact.artifact_kind !== 'assessment') return

    const hydratedMode = resolveModeFromArtifact(hydratedArtifact)
    const hydratedBlocks = Array.isArray(hydratedArtifact.output.blocks)
      ? (hydratedArtifact.output.blocks as LessonDraftBlock[])
      : []
    const hydratedQuiz =
      hydratedArtifact.output.quiz_payload &&
      typeof hydratedArtifact.output.quiz_payload === 'object'
        ? (hydratedArtifact.output.quiz_payload as QuizDraftPayload)
        : null
    const hydratedAssignment =
      hydratedArtifact.output.assignment_payload &&
      typeof hydratedArtifact.output.assignment_payload === 'object'
        ? (hydratedArtifact.output.assignment_payload as AssignmentDraftPayload)
        : null

    if (hydratedMode) setMode(hydratedMode)
    setArtifactId(hydratedArtifact.id)
    setBlocks(hydratedBlocks)
    setSelectedBlocks(new Set(hydratedBlocks.map((_, index) => index)))
    setQuizPayload(hydratedQuiz)
    setAssignmentPayload(hydratedAssignment)
  }, [hydratedArtifact])

  if (!state.activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih pelajaran terlebih dahulu untuk membuat asesmen.
        </p>
      </div>
    )
  }

  const resetPreview = () => {
    setArtifactId(null)
    setBlocks([])
    setSelectedBlocks(new Set())
    setQuizPayload(null)
    setAssignmentPayload(null)
  }

  const handleGenerate = async () => {
    if (!state.activeLesson || !state.courseId) return

    try {
      const result = await generateAssessment.mutateAsync({
        lesson_id: state.activeLesson.id,
        course_id: state.courseId,
        content_types: [mode],
      })

      const generatedBlocks = result.draft.blocks ?? []
      setArtifactId(result.artifact_id)
      setBlocks(generatedBlocks)
      setSelectedBlocks(new Set(generatedBlocks.map((_, index) => index)))
      setQuizPayload(result.draft.quiz_payload ?? null)
      setAssignmentPayload(result.draft.assignment_payload ?? null)
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menghasilkan asesmen.',
      })
    }
  }

  const handleApply = async () => {
    if (!artifactId || !state.activeLesson || !state.courseId) return

    try {
      await applyDraft.mutateAsync({
        artifactId,
        courseId: state.courseId,
        lessonId: state.activeLesson.id,
        selectedBlocks: blocks
          .filter((_, index) => selectedBlocks.has(index))
          .map((block) => ({
            type: block.type,
            title: block.title,
            content: block.content,
            metadata: {},
          })),
        quizPayload,
        assignmentPayload,
      })

      await actions.selectLesson(state.activeLesson.id)

      addToast({
        type: 'success',
        message:
          mode === 'quiz'
            ? 'Kuis AI berhasil ditambahkan ke pelajaran.'
            : mode === 'writing'
              ? 'Tugas AI berhasil ditambahkan ke pelajaran.'
              : `${selectedBlocks.size} blok bacaan berhasil ditambahkan.`,
      })

      resetPreview()
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal menerapkan asesmen.',
      })
    }
  }

  const toggleBlock = (index: number) => {
    setSelectedBlocks((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  if (generateAssessment.isPending) {
    return <CopilotLoadingState message="Menghasilkan asesmen..." />
  }

  const isPreviewVisible = blocks.length > 0 || !!quizPayload || !!assignmentPayload

  if (isPreviewVisible) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
              Pratinjau Asesmen
            </h3>
            {blocks.length > 0 && (
              <button
                onClick={() =>
                  setSelectedBlocks((prev) =>
                    prev.size === blocks.length
                      ? new Set()
                      : new Set(blocks.map((_, index) => index))
                  )
                }
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedBlocks.size === blocks.length ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
            )}
          </div>

          {quizPayload && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-violet-50/60 dark:bg-violet-950/30 p-4 space-y-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-violet-500">
                  Kuis AI
                </p>
                <h4 className="mt-1 text-sm font-bold text-slate-800 dark:text-slate-100">
                  {quizPayload.title}
                </h4>
                {quizPayload.instructions && (
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                    {quizPayload.instructions}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                {quizPayload.questions.slice(0, 5).map((question, index) => (
                  <div
                    key={`${question.text}-${index}`}
                    className="rounded-lg border border-violet-100 dark:border-violet-900/50 bg-white/80 dark:bg-slate-900/40 px-3 py-2"
                  >
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {index + 1}. {question.text}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {question.options.map((option, optionIndex) => (
                        <li
                          key={`${option.text}-${optionIndex}`}
                          className={cn(
                            'text-[11px] px-2 py-1 rounded-md',
                            option.is_correct
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                          )}
                        >
                          {option.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {assignmentPayload && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 p-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-indigo-500">
                Brief Tugas
              </p>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {assignmentPayload.title}
              </h4>
              <p className="text-xs whitespace-pre-wrap text-slate-600 dark:text-slate-300">
                {assignmentPayload.instructions}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Maks. poin: {assignmentPayload.max_points ?? 100}
              </p>
            </div>
          )}

          {blocks.map((block, index) => (
            <BlockPreviewCard
              key={`${block.title ?? 'blok'}-${index}`}
              block={block}
              index={index}
              selected={selectedBlocks.has(index)}
              onToggle={() => toggleBlock(index)}
            />
          ))}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <button
            onClick={handleApply}
            disabled={
              applyDraft.isPending ||
              (blocks.length > 0 && selectedBlocks.size === 0 && !quizPayload && !assignmentPayload)
            }
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {applyDraft.isPending ? 'Menerapkan...' : 'Terapkan Asesmen'}
          </button>
          <button
            onClick={resetPreview}
            className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Buat Ulang
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl p-3">
          <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
            Pelajaran Aktif
          </span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">
            {activeLessonTitle}
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Hasilkan asesmen langsung dari konteks pelajaran aktif. Semua hasil tetap berupa draft
          sampai Anda menerapkannya ke builder.
        </p>

        <div className="space-y-2">
          {MODES.map((entry) => (
            <button
              key={entry.value}
              onClick={() => setMode(entry.value)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left',
                mode === entry.value
                  ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/40 ring-1 ring-indigo-200 dark:ring-indigo-800'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  mode === entry.value
                    ? 'bg-indigo-100 dark:bg-indigo-900/50'
                    : 'bg-slate-100 dark:bg-slate-700'
                )}
              >
                <entry.icon
                  className={cn(
                    'w-4 h-4',
                    mode === entry.value ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500'
                  )}
                />
              </div>
              <div>
                <h4
                  className={cn(
                    'text-sm font-bold',
                    mode === entry.value
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-700 dark:text-slate-200'
                  )}
                >
                  {entry.label}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{entry.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <button
          onClick={handleGenerate}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30"
        >
          <Sparkles className="w-4 h-4" />
          Hasilkan Asesmen
        </button>
      </div>
    </div>
  )
}
