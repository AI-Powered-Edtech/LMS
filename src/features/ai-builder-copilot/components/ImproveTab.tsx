import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useBuilder } from '@/contexts/BuilderContext'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { useTransformContent } from '../queries/aiBuilderCopilotQueries'
import { useBuilderAICopilotStore } from '../store/builderAICopilot.store'
import type { TransformAction } from '../types'
import { TRANSFORM_ACTION_LABELS } from '../types'
import { CopilotLoadingState } from './shared/CopilotLoadingState'
import { DiffPreview } from './shared/DiffPreview'

const ACTIONS: TransformAction[] = [
  'summarize',
  'expand',
  'simplify',
  'tone-rewrite',
  'grade-align',
  'quiz-seed',
  'assignment-brief',
]

export function ImproveTab() {
  const { state, actions } = useBuilder()
  const addToast = useToast((s) => s.addToast)
  const transformContent = useTransformContent()
  const hydratedArtifact = useBuilderAICopilotStore((s) => s.hydratedArtifact)

  const [selectedAction, setSelectedAction] = useState<TransformAction | null>(null)
  const [originalContent, setOriginalContent] = useState('')
  const [transformedContent, setTransformedContent] = useState('')

  // Find the active block's content
  const activeBlock = state.activeLesson?.blocks.find((b) => b.id === state.activeBlockId)
  const blockContent = activeBlock?.content ?? ''

  const lessonTitle =
    state.modules.flatMap((m) => m.lessons).find((l) => l.id === state.activeLesson?.id)?.title ??
    ''

  useEffect(() => {
    if (!hydratedArtifact || hydratedArtifact.artifact_kind !== 'transform') return

    const action =
      typeof hydratedArtifact.prompt_config.action === 'string'
        ? (hydratedArtifact.prompt_config.action as TransformAction)
        : null
    const output = hydratedArtifact.output ?? {}
    const content =
      typeof output.transformed_content === 'string'
        ? output.transformed_content
        : JSON.stringify(output, null, 2)

    setSelectedAction(action)
    setOriginalContent(blockContent)
    setTransformedContent(content)
  }, [hydratedArtifact, blockContent])

  if (!state.activeLesson) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih pelajaran terlebih dahulu untuk menggunakan fitur perbaikan.
        </p>
      </div>
    )
  }

  if (!activeBlock || !blockContent) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Pilih blok teks untuk menggunakan fitur perbaikan. Klik pada blok konten di editor.
        </p>
      </div>
    )
  }

  const handleTransform = async (action: TransformAction) => {
    if (!state.courseId || !blockContent) return

    setSelectedAction(action)
    setOriginalContent(blockContent)

    try {
      const result = await transformContent.mutateAsync({
        course_id: state.courseId,
        block_content: blockContent,
        action,
        context: {
          lesson_id: state.activeLesson!.id,
          lesson_title: lessonTitle,
          block_type: activeBlock.type,
          block_id: activeBlock.id,
        },
      })

      const content =
        (result.result.transformed_content as string) ?? JSON.stringify(result.result, null, 2)

      setTransformedContent(content)
    } catch (err) {
      addToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Gagal mentransformasi konten.',
      })
      setSelectedAction(null)
    }
  }

  const handleApply = () => {
    if (!activeBlock || !transformedContent) return

    actions.updateBlock(activeBlock.id, { content: transformedContent })
    actions.saveBlock(activeBlock.id)

    addToast({ type: 'success', message: 'Konten berhasil diperbarui.' })

    // Reset
    setTransformedContent('')
    setOriginalContent('')
    setSelectedAction(null)
  }

  if (transformContent.isPending) {
    return (
      <CopilotLoadingState
        message={`${selectedAction ? TRANSFORM_ACTION_LABELS[selectedAction] : 'Memproses'}...`}
      />
    )
  }

  // Diff preview mode
  if (transformedContent && originalContent) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Hasil: {selectedAction ? TRANSFORM_ACTION_LABELS[selectedAction] : 'Transformasi'}
          </h3>
          <DiffPreview original={originalContent} transformed={transformedContent} />
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-4 space-y-2">
          <button
            onClick={handleApply}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Terapkan Perubahan
          </button>
          <button
            onClick={() => {
              setTransformedContent('')
              setOriginalContent('')
              setSelectedAction(null)
            }}
            className="w-full py-2 text-sm font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
          >
            Batal
          </button>
        </div>
      </div>
    )
  }

  // Action selection mode
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Blok Aktif
          </span>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
            {blockContent.slice(0, 120)}...
          </p>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Pilih aksi untuk meningkatkan atau mengubah konten blok yang dipilih.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {ACTIONS.map((action) => (
            <button
              key={action}
              onClick={() => handleTransform(action)}
              className={cn(
                'px-3 py-2.5 text-xs font-bold rounded-xl border transition-all text-center',
                'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800',
                'hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
                'hover:text-indigo-600 dark:hover:text-indigo-400',
                'text-slate-600 dark:text-slate-300'
              )}
            >
              {TRANSFORM_ACTION_LABELS[action]}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
