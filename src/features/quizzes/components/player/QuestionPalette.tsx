import { cn } from '@/src/utils/cn';
import { SubmitAnswer } from '@/src/features/quizzes';
import type { QuizAttemptQuestion } from '../../types/quizzes.types';

interface QuestionPaletteProps {
  questions: QuizAttemptQuestion[];
  currentQuestionIdx: number;
  answers: Record<string, SubmitAnswer>;
  flagged: Set<string>;
  onJump: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

function isQuestionAnswered(q: QuizAttemptQuestion, answers: Record<string, SubmitAnswer>): boolean {
  return ['SHORT_ANSWER', 'ESSAY'].includes(q.question_type)
    ? !!answers[q.question_id]?.text_answer?.trim()
    : (answers[q.question_id]?.selected_option_ids?.length ?? 0) > 0;
}

export function QuestionPalette({
  questions,
  currentQuestionIdx,
  answers,
  flagged,
  onJump,
  orientation = 'horizontal',
}: QuestionPaletteProps) {
  const answeredCount = questions.filter(q => isQuestionAnswered(q, answers)).length;

  return (
    <div>
      {orientation === 'vertical' && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
            Navigasi Soal
          </h3>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {answeredCount} / {questions.length} dijawab
          </p>
        </div>
      )}

      <div className={cn(
        'grid gap-2',
        orientation === 'vertical' ? 'grid-cols-5' : 'grid-cols-5 sm:grid-cols-10',
      )}>
        {questions.map((q, i) => {
          const isAnswered = isQuestionAnswered(q, answers);
          const isFlagged = flagged.has(q.question_id);
          const isCurrent = i === currentQuestionIdx;

          return (
            <button
              key={q.id || i}
              onClick={() => onJump(i)}
              title={
                isFlagged
                  ? `Soal ${i + 1} (Ditandai)`
                  : isAnswered
                  ? `Soal ${i + 1} (Dijawab)`
                  : `Soal ${i + 1}`
              }
              className={cn(
                'relative w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold border-2 transition-all duration-150',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                // Current takes priority over all other states
                isCurrent && 'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500 ring-2 ring-blue-400 ring-offset-1 dark:ring-offset-slate-900 shadow-md shadow-blue-200 dark:shadow-blue-900/40',
                // Flagged (may overlap answered)
                !isCurrent && isFlagged && 'bg-amber-400 dark:bg-amber-500 text-white border-amber-400 dark:border-amber-500 shadow-sm shadow-amber-100 dark:shadow-amber-900/30',
                // Answered
                !isCurrent && !isFlagged && isAnswered && 'bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-500 dark:border-emerald-600 shadow-sm shadow-emerald-100 dark:shadow-emerald-900/30',
                // Unanswered
                !isCurrent && !isFlagged && !isAnswered && 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500',
              )}
            >
              {i + 1}
              {isFlagged && !isCurrent && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 dark:bg-amber-400 rounded-full border-2 border-white dark:border-slate-900" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend — always visible */}
      <div className={cn(
        'mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400',
        orientation === 'vertical' ? 'flex-col gap-y-2' : '',
      )}>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 inline-block" />
          Belum dijawab
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-emerald-500 dark:bg-emerald-600 inline-block" />
          Sudah dijawab
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-amber-400 dark:bg-amber-500 inline-block" />
          Ditandai
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-md bg-blue-600 dark:bg-blue-500 inline-block" />
          Saat ini
        </span>
      </div>

      {/* Progress bar for vertical mode */}
      {orientation === 'vertical' && (
        <div className="mt-4">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 dark:bg-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
