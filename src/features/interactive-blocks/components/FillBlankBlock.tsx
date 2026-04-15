import { CheckCircle, XCircle } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { useToast } from '@/hooks/useToast'

import { useInteractiveProgress } from '../hooks/useInteractiveProgress'
import type { FillBlankData } from '../types'
import { scoreFillBlank } from '../utils/interactiveScoring'

interface FillBlankBlockProps {
  data: FillBlankData
  blockId: string
  lessonId: string
}

// Parse template into segments: { type: 'text' | 'blank', value: string, blankId?: string }
function parseTemplate(template: string) {
  const segments: Array<{ type: 'text' | 'blank'; value: string; blankId?: string }> = []
  const regex = /\{\{([\w-]+)\}\}/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: template.slice(lastIndex, match.index) })
    }
    segments.push({ type: 'blank', value: match[0], blankId: match[1] })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < template.length) {
    segments.push({ type: 'text', value: template.slice(lastIndex) })
  }
  return segments
}

export function FillBlankBlock({ data, blockId, lessonId }: FillBlankBlockProps) {
  const { progress, markComplete, isCompleted } = useInteractiveProgress(blockId, lessonId)
  const addToast = useToast((s) => s.addToast)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, boolean | null>>({})
  const [checked, setChecked] = useState(false)
  const inputWidthRef = useRef<HTMLSpanElement>(null)

  const segments = useMemo(() => parseTemplate(data?.template ?? ''), [data?.template])

  // Restore from DB
  useEffect(() => {
    if (progress?.interaction_data?.answers) {
      setAnswers(progress.interaction_data.answers as Record<string, string>)
      if (progress.is_completed) setChecked(true)
    }
  }, [progress])

  const handleInput = (blankId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [blankId]: value }))
    setChecked(false)
    setResults({})
  }

  const handleCheck = () => {
    const { score, results: scoringResults, totalCount } = scoreFillBlank(data, answers)
    const resultMap: Record<string, boolean> = {}
    scoringResults.forEach((r) => {
      resultMap[r.id] = r.isCorrect
    })
    setResults(resultMap)
    setChecked(true)

    const correctCount = scoringResults.filter((r) => r.isCorrect).length
    if (correctCount === totalCount && totalCount > 0) {
      markComplete({ answers }, score)
      addToast({ type: 'success', message: 'Semua jawaban benar!' })
    } else {
      addToast({
        type: 'info',
        message: `${correctCount} dari ${totalCount} jawaban benar. Coba lagi!`,
      })
    }
  }

  const getHint = (blankId: string) => {
    if (!data.showHints) return null
    const answerDef = data.answers.find((a) => a.id === blankId)
    if (!answerDef?.acceptedAnswers?.length) return null
    const firstAccepted = answerDef.acceptedAnswers[0]
    return firstAccepted ? firstAccepted[0] + '...' : null
  }

  const allAnswered = (data?.answers ?? []).every((a) => (answers[a.id] ?? '').trim() !== '')

  return (
    <div className="px-6 py-4 space-y-4">
      {/* Rendered template with inline inputs */}
      <div className="text-base leading-loose text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 rounded-xl px-5 py-4 border border-slate-200 dark:border-slate-700">
        {segments.map((seg, i) => {
          if (seg.type === 'text') {
            return <span key={i}>{seg.value}</span>
          }
          const blankId = seg.blankId!
          const hint = getHint(blankId)
          const result = results[blankId]
          const isCk = isCompleted || checked

          return (
            <span key={i} className="inline-flex items-baseline gap-0.5 mx-1 relative">
              <span
                ref={inputWidthRef}
                className="invisible absolute whitespace-pre text-base px-2"
                aria-hidden
              >
                {answers[blankId] || (hint ?? '       ')}
              </span>
              <input
                type="text"
                value={answers[blankId] ?? ''}
                onChange={(e) => handleInput(blankId, e.target.value)}
                disabled={isCompleted}
                placeholder={hint ?? '___'}
                className={`inline border-b-2 bg-transparent text-base text-center outline-none px-1 min-w-[60px] transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 ${
                  isCk
                    ? result === true
                      ? 'border-emerald-500 text-emerald-700 dark:text-emerald-300'
                      : result === false
                        ? 'border-red-500 text-red-700 dark:text-red-300'
                        : 'border-slate-400 dark:border-slate-500'
                    : 'border-indigo-400 dark:border-indigo-500 focus:border-indigo-600 dark:focus:border-indigo-400'
                }`}
                style={{ width: `${Math.max(60, (answers[blankId]?.length ?? 0) * 10 + 30)}px` }}
              />
              {isCk && result === true && (
                <CheckCircle className="inline-block w-4 h-4 text-emerald-500 mb-0.5" />
              )}
              {isCk && result === false && (
                <XCircle className="inline-block w-4 h-4 text-red-500 mb-0.5" />
              )}
            </span>
          )
        })}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-3">
        {!isCompleted && (
          <Button onClick={handleCheck} disabled={!allAnswered} className="text-sm">
            Periksa Jawaban
          </Button>
        )}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Semua jawaban benar! Aktivitas selesai.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
