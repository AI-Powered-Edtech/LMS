import { cn } from '@/src/utils/cn';
import { SubmitAnswer } from '@/src/services/quizService';

interface QuestionPaletteProps {
  questions: any[];
  currentQuestionIdx: number;
  answers: Record<string, SubmitAnswer>;
  flagged: Set<string>;
  onJump: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

export function QuestionPalette({
  questions,
  currentQuestionIdx,
  answers,
  flagged,
  onJump,
  orientation = 'horizontal',
}: QuestionPaletteProps) {
  const answeredCount = questions.filter(q => {
    const isAnswered = ['SHORT_ANSWER', 'ESSAY'].includes(q.question_type)
      ? !!answers[q.id]?.text_answer?.trim()
      : (answers[q.id]?.selected_option_ids?.length ?? 0) > 0;
    return isAnswered;
  }).length;

  return (
    <div>
      {orientation === 'vertical' && (
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Navigasi Soal</h3>
          <p className="text-sm text-slate-400 font-medium">{answeredCount} / {questions.length} dijawab</p>
        </div>
      )}

      <div className={cn(
        "grid gap-2",
        orientation === 'vertical' ? "grid-cols-5" : "grid-cols-5 sm:grid-cols-10"
      )}>
        {questions.map((q, i) => {
          let style = "bg-slate-100 text-slate-500 hover:bg-slate-200 border-transparent";

          const isAnswered = ['SHORT_ANSWER', 'ESSAY'].includes(q.question_type)
            ? !!answers[q.id]?.text_answer?.trim()
            : (answers[q.id]?.selected_option_ids?.length ?? 0) > 0;

          if (isAnswered) style = "bg-green-50 text-green-700 border-green-200 hover:bg-green-100";
          if (flagged.has(q.id)) style = "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100";
          if (i === currentQuestionIdx) style = "bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700";

          return (
            <button
              key={q.id || i}
              onClick={() => onJump(i)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold border transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1",
                style
              )}
              title={flagged.has(q.id) ? `Soal ${i + 1} (Ditandai)` : `Soal ${i + 1}`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      {orientation === 'vertical' && (
        <div className="mt-4 space-y-1.5 text-xs text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
            <span>Belum dijawab</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-50 border border-green-200" />
            <span>Sudah dijawab</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-50 border border-yellow-200" />
            <span>Ditandai</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-600" />
            <span>Saat ini</span>
          </div>
        </div>
      )}

      {/* Progress bar for vertical mode */}
      {orientation === 'vertical' && (
        <div className="mt-4">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${(answeredCount / questions.length) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
