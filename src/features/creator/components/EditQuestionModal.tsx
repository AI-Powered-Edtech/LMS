import { useEffect, useState } from 'react'

import { Modal, ModalBody, ModalFooter, ModalHeader } from '@/components/ui/Modal'
import { cn } from '@/utils/cn'

interface QuizQuestion {
  id: string
  text: string
  options: string[]
  answer: number
  explanation?: string
  bloomLevel?: string
}

interface OpenQuestion {
  id: string
  text: string
  answer: string
  bloomLevel?: string
}

type Question = QuizQuestion | OpenQuestion

interface EditQuestionModalProps {
  open: boolean
  onClose: () => void
  question: Question | null
  questionType: 'quiz' | 'reading' | 'writing'
  onSave: (updated: Question) => void
}

function isQuizQuestion(q: Question): q is QuizQuestion {
  return Array.isArray((q as QuizQuestion).options)
}

export function EditQuestionModal({
  open,
  onClose,
  question,
  questionType,
  onSave,
}: EditQuestionModalProps) {
  const [text, setText] = useState('')
  const [options, setOptions] = useState<string[]>(['', '', '', ''])
  const [answer, setAnswer] = useState(0)
  const [explanation, setExplanation] = useState('')
  const [openAnswer, setOpenAnswer] = useState('')

  useEffect(() => {
    if (!question) return
    setText(question.text)
    if (isQuizQuestion(question)) {
      setOptions(question.options.length === 4 ? question.options : ['', '', '', ''])
      setAnswer(typeof question.answer === 'number' ? question.answer : 0)
      setExplanation(question.explanation ?? '')
    } else {
      setOpenAnswer(question.answer)
    }
  }, [question])

  const handleSave = () => {
    if (!question || !text.trim()) return
    if (isQuizQuestion(question)) {
      onSave({ ...question, text: text.trim(), options, answer, explanation })
    } else {
      onSave({ ...question, text: text.trim(), answer: openAnswer })
    }
    onClose()
  }

  const updateOption = (i: number, val: string) => {
    setOptions((prev) => prev.map((o, j) => (j === i ? val : o)))
  }

  if (!question) return null

  const optionLetters = ['A', 'B', 'C', 'D']

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader
        title={
          questionType === 'quiz'
            ? 'Edit Soal Pilihan Ganda'
            : questionType === 'reading'
              ? 'Edit Pertanyaan Bacaan'
              : 'Edit Topik Penulisan'
        }
        onClose={onClose}
      />
      <ModalBody className="space-y-5">
        {/* Question text */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            {questionType === 'writing' ? 'Topik' : 'Pertanyaan'}
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Masukkan teks pertanyaan..."
          />
        </div>

        {/* Quiz: options + correct answer */}
        {questionType === 'quiz' && (
          <>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Pilihan Jawaban
              </label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setAnswer(i)}
                      className={cn(
                        'w-8 h-8 rounded-full text-xs font-bold shrink-0 border-2 transition-colors',
                        answer === i
                          ? 'bg-green-500 border-green-500 text-white'
                          : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-green-400'
                      )}
                      title={`Tandai ${optionLetters[i]} sebagai jawaban benar`}
                    >
                      {optionLetters[i]}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={`Opsi ${optionLetters[i]}`}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                Klik huruf di kiri untuk menandai jawaban benar.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Penjelasan (opsional)
              </label>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Mengapa jawaban ini benar..."
              />
            </div>
          </>
        )}

        {/* Reading / Writing: answer/criteria */}
        {(questionType === 'reading' || questionType === 'writing') && (
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              {questionType === 'reading'
                ? 'Kunci Jawaban / Poin Penting'
                : 'Rubrik / Kriteria Penilaian'}
            </label>
            <textarea
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder={
                questionType === 'reading'
                  ? 'Poin-poin penting yang harus disebutkan...'
                  : 'Kriteria 1, Kriteria 2, Kriteria 3...'
              }
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
          className="px-5 py-2 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Simpan Perubahan
        </button>
      </ModalFooter>
    </Modal>
  )
}
