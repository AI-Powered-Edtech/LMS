import { DragDropContext, Draggable, Droppable, type DropResult } from '@hello-pangea/dnd'
import { BookTemplate, Loader2, Plus, Save, X } from 'lucide-react'
import { useState } from 'react'

import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'

import { useRubricBuilder } from '../hooks/useRubricBuilder'
import { useSaveRubric } from '../queries/rubricQueries'
import type { Rubric, RubricInsert } from '../types'
import { calculateTotalPoints, validateRubric } from '../utils/rubricCalculations'
import { AIRubricSuggestion } from './AIRubricSuggestion'
import { RubricCriterionRow } from './RubricCriterionRow'
import { RubricTemplateModal } from './RubricTemplateModal'

interface RubricBuilderProps {
  assignmentId?: string
  initialRubric?: Rubric
  onSave: (rubricId: string) => void
  onCancel: () => void
  /** Optional assignment context for AI rubric suggestion */
  assignmentTitle?: string
  assignmentDescription?: string
  assignmentInstructions?: string
}

const INPUT_CLS =
  'w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white dark:placeholder-slate-500 transition-colors'

export function RubricBuilder({
  assignmentId,
  initialRubric,
  onSave,
  onCancel,
  assignmentTitle = '',
  assignmentDescription = '',
  assignmentInstructions = '',
}: RubricBuilderProps) {
  const addToast = useToast((s) => s.addToast)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [aiSuggestionApplied, setAiSuggestionApplied] = useState(false)
  const saveRubric = useSaveRubric()

  const {
    state,
    addCriterion,
    updateCriterion,
    deleteCriterion,
    reorderCriteria,
    addLevel,
    updateLevel,
    deleteLevel,
    loadRubric,
    setTitle,
    setDescription,
    setIsTemplate,
  } = useRubricBuilder(assignmentId)

  // Load initial rubric on first render
  const [initialized, setInitialized] = useState(false)
  if (!initialized && initialRubric) {
    loadRubric(initialRubric)
    setInitialized(true)
  }

  const { rubric } = state
  const totalPoints = calculateTotalPoints(rubric.criteria)

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return
    const reordered = Array.from(rubric.criteria)
    const [moved] = reordered.splice(result.source.index, 1)
    reordered.splice(result.destination.index, 0, moved)
    reorderCriteria(reordered.map((c, i) => ({ ...c, order: i })))
  }

  const handleSave = async () => {
    const errors = validateRubric(rubric)
    if (errors.length > 0) {
      addToast({ type: 'error', message: errors[0] })
      return
    }

    try {
      const payload: RubricInsert & { id?: string } = {
        ...(initialRubric ? { id: initialRubric.id } : {}),
        assignment_id: assignmentId ?? null,
        title: rubric.title,
        description: rubric.description,
        is_template: rubric.is_template,
        created_by: '',
        criteria: rubric.criteria.map((c, ci) => ({
          ...c,
          order: ci,
          levels: c.levels.map((l, li) => ({ ...l, order: li })),
        })),
      }

      const rubricId = await saveRubric.mutateAsync(payload)
      addToast({ type: 'success', message: 'Rubrik berhasil disimpan.' })
      onSave(rubricId)
    } catch {
      addToast({ type: 'error', message: 'Gagal menyimpan rubrik. Silakan coba lagi.' })
    }
  }

  const handleTemplateSelect = (template: Rubric) => {
    const cloned: Rubric = {
      ...template,
      id: '',
      assignment_id: assignmentId ?? null,
      is_template: false,
    }
    loadRubric(cloned)
    setShowTemplateModal(false)
    addToast({ type: 'info', message: `Template "${template.title}" berhasil diimpor.` })
  }

  const handleAISuggested = (aiRubric: RubricInsert) => {
    // Map RubricInsert criteria onto a partial Rubric shape loadRubric accepts
    const asRubric: Rubric = {
      id: '',
      tenant_id: '',
      created_at: '',
      total_points: 0,
      assignment_id: assignmentId ?? null,
      title: aiRubric.title,
      description: aiRubric.description,
      is_template: false,
      created_by: '',
      criteria: aiRubric.criteria,
    }
    loadRubric(asRubric)
    setAiSuggestionApplied(true)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <div>
            <label
              htmlFor="rubric-title"
              className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Judul Rubrik
            </label>
            <input
              id="rubric-title"
              type="text"
              value={rubric.title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Rubrik Esai Argumentatif"
              className={cn(INPUT_CLS, 'font-bold')}
            />
          </div>
          <div>
            <label
              htmlFor="rubric-description"
              className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block"
            >
              Deskripsi (Opsional)
            </label>
            <textarea
              id="rubric-description"
              value={rubric.description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan tujuan rubrik ini..."
              rows={2}
              className={cn(INPUT_CLS, 'resize-none')}
            />
          </div>
        </div>
      </div>

      {/* Stats & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Total Poin:</span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400">
              {totalPoints}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 dark:text-slate-400">Kriteria:</span>
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {rubric.criteria.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Template toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                className="sr-only"
                checked={rubric.is_template}
                onChange={(e) => setIsTemplate(e.target.checked)}
              />
              <div
                className={cn(
                  'w-10 h-5 rounded-full transition-colors',
                  rubric.is_template
                    ? 'bg-purple-500 dark:bg-purple-600'
                    : 'bg-slate-200 dark:bg-slate-700'
                )}
              />
              <div
                className={cn(
                  'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  rubric.is_template && 'translate-x-5'
                )}
              />
            </div>
            <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
              Simpan sebagai Template
            </span>
          </label>

          {/* Import template */}
          <button
            type="button"
            onClick={() => setShowTemplateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl transition-colors"
          >
            <BookTemplate className="w-4 h-4" />
            Impor Template
          </button>

          {/* AI Rubric Suggestion */}
          <AIRubricSuggestion
            assignmentTitle={assignmentTitle}
            description={assignmentDescription}
            instructions={assignmentInstructions}
            onSuggested={handleAISuggested}
          />
        </div>
      </div>

      {/* AI suggestion notice */}
      {aiSuggestionApplied && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl">
          <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
            ✨ Saran AI dihasilkan — tinjau dan sesuaikan sebelum menyimpan
          </p>
          <button
            type="button"
            onClick={() => setAiSuggestionApplied(false)}
            className="text-violet-400 hover:text-violet-600 dark:hover:text-violet-200 transition-colors"
            aria-label="Tutup notifikasi"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Criteria list */}
      <div className="space-y-3">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="criteria-list">
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className="space-y-3"
              >
                {rubric.criteria.length === 0 && (
                  <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <p className="text-slate-400 dark:text-slate-500 text-sm font-bold">
                      Belum ada kriteria
                    </p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                      Klik tombol di bawah untuk menambahkan kriteria pertama.
                    </p>
                  </div>
                )}
                {rubric.criteria.map((criterion, index) => (
                  <Draggable key={criterion.id} draggableId={criterion.id} index={index}>
                    {(draggableProvided) => (
                      <RubricCriterionRow
                        criterion={criterion}
                        provided={draggableProvided}
                        onUpdate={(updates) => updateCriterion(criterion.id, updates)}
                        onDelete={() => deleteCriterion(criterion.id)}
                        onAddLevel={() => addLevel(criterion.id)}
                        onUpdateLevel={(levelId, updates) =>
                          updateLevel(criterion.id, levelId, updates)
                        }
                        onDeleteLevel={(levelId) => deleteLevel(criterion.id, levelId)}
                      />
                    )}
                  </Draggable>
                ))}
                {droppableProvided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Add Criterion */}
        <button
          type="button"
          onClick={addCriterion}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl font-bold text-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Tambah Kriteria
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
          Batal
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={saveRubric.isPending}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-none disabled:opacity-50"
        >
          {saveRubric.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan Rubrik
        </button>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <RubricTemplateModal
          onSelect={handleTemplateSelect}
          onClose={() => setShowTemplateModal(false)}
        />
      )}
    </div>
  )
}
