import { MessageSquare } from 'lucide-react'

import { cn } from '@/utils/cn'

import type { Rubric, RubricScore } from '../types'
import { calculateEarnedPoints, calculateTotalPoints } from '../utils/rubricCalculations'
import { RubricLevelCell } from './RubricLevelCell'

interface RubricScoringGridProps {
  rubric: Rubric
  scores: RubricScore[]
  onChange: (scores: RubricScore[]) => void
}

export function RubricScoringGrid({ rubric, scores, onChange }: RubricScoringGridProps) {
  const scoreMap = new Map(scores.map((s) => [s.criterion_id, s]))
  const totalPoints = calculateTotalPoints(rubric.criteria)
  const earnedPoints = calculateEarnedPoints(rubric.criteria, scores)

  const handleLevelClick = (criterionId: string, levelId: string, points: number) => {
    const existing = scoreMap.get(criterionId)
    // Toggle: clicking same level removes the selection
    if (existing?.level_id === levelId) {
      onChange(scores.filter((s) => s.criterion_id !== criterionId))
      return
    }
    const updated: RubricScore = {
      criterion_id: criterionId,
      level_id: levelId,
      score: points,
      comment: existing?.comment ?? '',
    }
    onChange([...scores.filter((s) => s.criterion_id !== criterionId), updated])
  }

  const handleCommentChange = (criterionId: string, comment: string) => {
    const existing = scoreMap.get(criterionId)
    if (existing) {
      onChange(scores.map((s) => (s.criterion_id === criterionId ? { ...s, comment } : s)))
    } else {
      // Create a placeholder score entry for the comment (score 0, no level)
      onChange([...scores, { criterion_id: criterionId, level_id: null, score: 0, comment }])
    }
  }

  const sortedCriteria = rubric.criteria.slice().sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-6">
      {sortedCriteria.map((criterion) => {
        const currentScore = scoreMap.get(criterion.id)
        const sortedLevels = criterion.levels.slice().sort((a, b) => a.order - b.order)

        return (
          <div key={criterion.id} className="space-y-2">
            {/* Criterion header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-white text-sm">
                  {criterion.title}
                </h4>
                {criterion.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {criterion.description}
                  </p>
                )}
              </div>
              <span
                className={cn(
                  'text-sm font-bold px-2 py-1 rounded-lg shrink-0',
                  currentScore
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                )}
              >
                {currentScore?.score ?? 0} / {criterion.max_points}
              </span>
            </div>

            {/* Level cells */}
            <div className="grid grid-cols-1 gap-2">
              {sortedLevels.map((level) => (
                <RubricLevelCell
                  key={level.id}
                  level={level}
                  isSelected={currentScore?.level_id === level.id}
                  onClick={() => handleLevelClick(criterion.id, level.id, level.points)}
                />
              ))}
            </div>

            {/* Comment per criterion */}
            <div className="flex items-start gap-2 mt-1">
              <MessageSquare className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 mt-2.5 shrink-0" />
              <textarea
                value={currentScore?.comment ?? ''}
                onChange={(e) => handleCommentChange(criterion.id, e.target.value)}
                placeholder="Komentar untuk kriteria ini (opsional)..."
                rows={2}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none dark:text-white dark:placeholder-slate-500 resize-none transition-colors"
              />
            </div>
          </div>
        )
      })}

      {/* Running Total */}
      <div className="sticky bottom-0 pt-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">
            Total Nilai Rubrik
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
              {earnedPoints}
            </span>
            <span className="text-sm text-slate-400 dark:text-slate-500">/ {totalPoints}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
