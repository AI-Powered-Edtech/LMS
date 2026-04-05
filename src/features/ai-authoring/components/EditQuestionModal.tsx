import { useEffect, useState } from 'react'

import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'

import type { AIAuthoringQuestion, AIOpenQuestion, AIQuizQuestion, QuestionType } from '../types'
import { isQuizQuestion } from '../types'

interface EditQuestionModalProps {
  open: boolean
  onClose: () => void
  question: AIAuthoringQuestion | null
  onSave: (updated: AIAuthoringQuestion) => void
}

const MODAL_TITLES: Record<QuestionType, string> = {
  MCQ: 'Edit Soal Pilihan Ganda',
  TRUE_FALSE: 'Edit Soal Benar/Salah',
  MULTIPLE_SELECT: 'Edit Pilih Beberapa',
  SHORT_ANSWER: 'Edit Jawaban Singkat',
  OPEN: 'Edit Soal Esai',
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E']

function getDefaultOptions(
  question_type: QuestionType
): Array<{ text: string; is_correct: boolean }> {
  if (question_type === 'TRUE_FALSE') {
    return [
      { text: 'Benar', is_correct: true },
      { text: 'Salah', is_correct: false },
    ]
  }
  return [
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
    { text: '', is_correct: false },
  ]
}

export function EditQuestionModal({ open, onClose, question, onSave }: EditQuestionModalProps) {
  const [text, setText] = useState('')
  const [options, setOptions] = useState<Array<{ text: string; is_correct: boolean }>>([])
  const [explanation, setExplanation] = useState('')
  const [openAnswer, setOpenAnswer] = useState('')

  useEffect(() => {
    if (!question) return
    setText(question.text)
    if (isQuizQuestion(question)) {
      const q = question as AIQuizQuestion
      setOptions(q.options.length > 0 ? q.options : getDefaultOptions(q.question_type))
      setExplanation(q.explanation ?? '')
      setOpenAnswer('')
    } else {
      const q = question as AIOpenQuestion
      setOpenAnswer(q.answer)
      setOptions([])
      setExplanation('')
    }
  }, [question])

  const handleSave = () => {
    if (!question || !text.trim()) return

    if (isQuizQuestion(question)) {
      const updated: AIQuizQuestion = {
        ...question,
        text: text.trim(),
        options,
        explanation: explanation.trim() || undefined,
      }
      onSave(updated)
    } else {
      const updated: AIOpenQuestion = {
        ...(question as AIOpenQuestion),
        text: text.trim(),
        answer: openAnswer.trim(),
      }
      onSave(updated)
    }
    onClose()
  }

  const updateOptionText = (i: number, val: string) => {
    setOptions((prev) => prev.map((o, j) => (j === i ? { ...o, text: val } : o)))
  }

  const toggleOptionCorrect = (i: number) => {
    setOptions((prev) => {
      if (!question) return prev
      const questionType = (question as AIQuizQuestion).question_type
      // For TRUE_FALSE and MCQ: only one correct answer at a time
      if (questionType === 'TRUE_FALSE' || questionType === 'MCQ') {
        return prev.map((o, j) => ({ ...o, is_correct: j === i }))
      }
      // For MULTIPLE_SELECT: toggle individually
      return prev.map((o, j) => (j === i ? { ...o, is_correct: !o.is_correct } : o))
    })
  }

  if (!question) return null

  const isQuiz = isQuizQuestion(question)
  const questionType = question.question_type
  const modalTitle = MODAL_TITLES[questionType] ?? 'Edit Soal'
  const isTrueFalse = questionType === 'TRUE_FALSE'
  const isMultiSelect = questionType === 'MULTIPLE_SELECT'

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title={modalTitle} onClose={onClose} />
      <ModalBody className="space-y-5">
        {/* Question text */}
        <div>
          <label
            htmlFor="eq-text"
            className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
          >
            Teks Soal
          </label>
          <textarea
            id="eq-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Masukkan teks soal..."
          />
        </div>

        {/* Quiz: options + correct answer */}
        {isQuiz && (
          <>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Pilihan Jawaban
                </p>
                {isMultiSelect && (
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    Beberapa jawaban bisa benar
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => toggleOptionCorrect(i)}
                      disabled={isTrueFalse}
                      className={cn(
                        'w-8 h-8 rounded-full text-xs font-bold shrink-0 border-2 transition-colors',
                        opt.is_correct
                          ? 'bg-green-500 dark:bg-green-600 border-green-500 dark:border-green-600 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-green-400 dark:hover:border-green-500',
                        isTrueFalse && 'cursor-default'
                      )}
                      title={
                        isTrueFalse
                          ? undefined
                          : `Tandai ${OPTION_LETTERS[i] ?? i + 1} sebagai jawaban ${isMultiSelect ? 'benar/salah' : 'benar'}`
                      }
                      aria-label={
                        isTrueFalse
                          ? opt.text
                          : `Tandai opsi ${OPTION_LETTERS[i] ?? i + 1} sebagai ${opt.is_correct ? 'salah' : 'benar'}`
                      }
                    >
                      {OPTION_LETTERS[i] ?? String(i + 1)}
                    </button>
                    <input
                      value={opt.text}
                      onChange={(e) => updateOptionText(i, e.target.value)}
                      disabled={isTrueFalse}
                      className={cn(
                        'flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                        isTrueFalse && 'opacity-70 cursor-default'
                      )}
                      placeholder={`Opsi ${OPTION_LETTERS[i] ?? i + 1}`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                {isTrueFalse
                  ? 'Klik huruf di kiri untuk menandai jawaban benar.'
                  : isMultiSelect
                    ? 'Klik huruf di kiri untuk menandai satu atau lebih jawaban benar.'
                    : 'Klik huruf di kiri untuk menandai jawaban benar.'}
              </p>
            </div>

            {/* Explanation */}
            <div>
              <label
                htmlFor="eq-explanation"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Penjelasan (opsional)
              </label>
              <textarea
                id="eq-explanation"
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Mengapa jawaban ini benar..."
              />
            </div>
          </>
        )}

        {/* Open question: answer / rubric */}
        {!isQuiz && (
          <div>
            <label
              htmlFor="eq-open-answer"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
            >
              Kunci Jawaban / Rubrik Penilaian
            </label>
            <textarea
              id="eq-open-answer"
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              rows={4}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Poin-poin penting yang harus disebutkan dalam jawaban..."
            />
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!text.trim()}
          className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Simpan Perubahan
        </button>
      </ModalFooter>
    </Modal>
  )
}
