import { ArrowLeft, ArrowRight } from 'lucide-react';

interface QuizFooterProps {
  currentQuestionIdx: number;
  isLastQuestion: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onFinish: () => void;
}

export function QuizFooter({
  currentQuestionIdx,
  isLastQuestion,
  onPrevious,
  onNext,
  onFinish
}: QuizFooterProps) {
  return (
    <div className="flex items-center justify-between pt-2 pb-6">
      <button
        onClick={onPrevious}
        disabled={currentQuestionIdx === 0}
        className="px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:hover:bg-transparent flex items-center gap-2 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Sebelumnya
      </button>

      {isLastQuestion ? (
        <button
          onClick={onFinish}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          Selesai & Review
          <ArrowRight className="w-4 h-4" />
        </button>
      ) : (
        <button
          onClick={onNext}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
        >
          Selanjutnya
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
