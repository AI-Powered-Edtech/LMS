import type {
  MultiTypeAnswer,
  QuestionType,
  QuizQuestion,
} from '@/features/quizzes/hooks/quizViewerTypes'
import { cn } from '@/utils/cn'

function QuestionTypeBadge({ type, points }: { type: QuestionType; points?: number }) {
  const labels: Record<QuestionType, string> = {
    MCQ: 'Pilihan Ganda',
    TRUE_FALSE: 'Benar/Salah',
    MULTIPLE_SELECT: 'Pilih Beberapa',
    SHORT_ANSWER: 'Jawaban Singkat',
    ESSAY: 'Esai',
  }
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full font-medium">
        {labels[type]}
      </span>
      {points && <span className="text-xs text-slate-400">{points} poin</span>}
    </div>
  )
}

interface QuizViewerQuestionProps {
  question: QuizQuestion
  questionIndex: number
  answer: MultiTypeAnswer | undefined
  questionType: QuestionType
  onSelectOption: (questionId: string, optionId: string) => void
  onToggleOption: (questionId: string, optionId: string) => void
  onTextChange: (questionId: string, text: string) => void
}

export function QuizViewerQuestion({
  question,
  questionIndex,
  answer,
  questionType,
  onSelectOption,
  onToggleOption,
  onTextChange,
}: QuizViewerQuestionProps) {
  return (
    <div className="space-y-3">
      <QuestionTypeBadge type={questionType} points={question.points} />
      <h3 className="font-bold text-slate-800 dark:text-slate-200">
        {questionIndex + 1}. {question.text}
      </h3>

      {/* MCQ / TRUE_FALSE */}
      {(questionType === 'MCQ' || questionType === 'TRUE_FALSE') && (
        <div className="space-y-2">
          {question.quiz_options.map((option) => (
            <button
              key={option.id}
              onClick={() => onSelectOption(question.id, option.id)}
              className={cn(
                'w-full text-left p-3 rounded-xl border-2 transition-colors font-medium text-sm',
                answer?.selected_option_ids?.includes(option.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  : 'border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300'
              )}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}

      {/* MULTIPLE_SELECT */}
      {questionType === 'MULTIPLE_SELECT' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 italic">Pilih semua yang benar</p>
          {question.quiz_options.map((option) => (
            <button
              key={option.id}
              onClick={() => onToggleOption(question.id, option.id)}
              className={cn(
                'w-full text-left p-3 rounded-xl border-2 transition-colors font-medium text-sm flex items-center gap-3',
                answer?.selected_option_ids?.includes(option.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                  : 'border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300'
              )}
            >
              <span
                className={cn(
                  'w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center text-xs',
                  answer?.selected_option_ids?.includes(option.id)
                    ? 'border-blue-500 dark:border-blue-600 bg-blue-500 dark:bg-blue-600 text-white'
                    : 'border-slate-300 dark:border-slate-600'
                )}
              >
                {answer?.selected_option_ids?.includes(option.id) && '✓'}
              </span>
              {option.text}
            </button>
          ))}
        </div>
      )}

      {/* SHORT_ANSWER */}
      {questionType === 'SHORT_ANSWER' && (
        <div>
          <input
            type="text"
            value={answer?.text_answer || ''}
            onChange={(e) => onTextChange(question.id, e.target.value)}
            placeholder="Ketik jawaban singkat..."
            className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-0 outline-none text-sm transition-colors"
          />
        </div>
      )}

      {/* ESSAY */}
      {questionType === 'ESSAY' && (
        <div>
          <textarea
            value={answer?.text_answer || ''}
            onChange={(e) => onTextChange(question.id, e.target.value)}
            placeholder="Tulis jawaban esai..."
            rows={6}
            className="w-full p-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-0 outline-none text-sm resize-y transition-colors"
          />
          <div className="text-right text-xs text-slate-400 mt-1">
            {(answer?.text_answer || '').length} karakter
          </div>
        </div>
      )}
    </div>
  )
}
