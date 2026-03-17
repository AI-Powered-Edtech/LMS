import { Flag } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { SubmitAnswer } from '@/src/services/quizService';

interface QuizBodyProps {
  question: any;
  questionType: string;
  currentAnswer: SubmitAnswer | undefined;
  isFlagged: boolean;
  onToggleFlag: (id: string) => void;
  onAnswer: (questionId: string, answer: SubmitAnswer) => void;
}

export function QuizBody({
  question,
  questionType,
  currentAnswer,
  isFlagged,
  onToggleFlag,
  onAnswer
}: QuizBodyProps) {

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 relative">
      <button
        onClick={() => onToggleFlag(question.id)}
        className={cn(
          "absolute top-6 right-6 p-2 rounded-xl border transition-colors flex items-center gap-2 text-sm font-bold",
          isFlagged ? "bg-yellow-100 border-yellow-200 text-yellow-700" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
        )}
      >
        <Flag className={cn("w-4 h-4", isFlagged && "fill-current")} />
        {isFlagged ? 'Ditandai' : 'Tandai'}
      </button>

      {/* Question Type Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn(
          'inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider',
          questionType === 'ESSAY' ? 'bg-purple-100 text-purple-700' :
          questionType === 'SHORT_ANSWER' ? 'bg-amber-100 text-amber-700' :
          questionType === 'MULTIPLE_SELECT' ? 'bg-cyan-100 text-cyan-700' :
          questionType === 'TRUE_FALSE' ? 'bg-teal-100 text-teal-700' :
          'bg-blue-100 text-blue-700'
        )}>
          {questionType === 'MCQ' ? 'Pilihan Ganda' :
           questionType === 'TRUE_FALSE' ? 'Benar / Salah' :
           questionType === 'MULTIPLE_SELECT' ? 'Pilihan Banyak' :
           questionType === 'SHORT_ANSWER' ? 'Jawaban Singkat' :
           questionType === 'ESSAY' ? 'Esai' : 'Soal'}
        </span>
        {question.points && question.points > 0 && (
          <span className="text-xs font-bold text-slate-400">{question.points} poin</span>
        )}
      </div>

      <h3 className="text-xl font-medium text-slate-900 mb-8 leading-relaxed mt-4 pr-24">{question.text}</h3>

      {/* MCQ / TRUE_FALSE — Radio Buttons */}
      {(questionType === 'MCQ' || questionType === 'TRUE_FALSE') && (
        <div className="space-y-3">
          {question.quiz_options?.map((option: any) => {
            const isSelected = currentAnswer?.selected_option_ids?.includes(option.id) ?? false;
            return (
              <button
                key={option.id}
                onClick={() => onAnswer(question.id, { question_id: question.id, selected_option_ids: [option.id] })}
                className={cn(
                  'w-full flex items-center space-x-4 p-4 rounded-2xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-slate-100 hover:border-blue-200 hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0",
                  isSelected ? "border-blue-500" : "border-slate-300"
                )}>
                  {isSelected && <div className="w-3 h-3 bg-blue-500 rounded-full" />}
                </div>
                <span className="font-medium text-base">{option.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* MULTIPLE_SELECT — Checkboxes */}
      {questionType === 'MULTIPLE_SELECT' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 -mt-4 mb-4 italic">Pilih semua jawaban yang benar</p>
          {question.quiz_options?.map((option: any) => {
            const currentIds = currentAnswer?.selected_option_ids || [];
            const isSelected = currentIds.includes(option.id);
            return (
              <button
                key={option.id}
                onClick={() => {
                  const newIds = isSelected
                    ? currentIds.filter((id: string) => id !== option.id)
                    : [...currentIds, option.id];
                  onAnswer(question.id, { question_id: question.id, selected_option_ids: newIds });
                }}
                className={cn(
                  'w-full flex items-center space-x-4 p-4 rounded-2xl border-2 text-left transition-all',
                  isSelected
                    ? 'border-cyan-500 bg-cyan-50 text-cyan-900'
                    : 'border-slate-100 hover:border-cyan-200 hover:bg-slate-50 text-slate-700'
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0",
                  isSelected ? "border-cyan-500 bg-cyan-500" : "border-slate-300"
                )}>
                  {isSelected && (
                    <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="font-medium text-base">{option.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* SHORT_ANSWER — Text Input */}
      {questionType === 'SHORT_ANSWER' && (
        <div>
          <input
            type="text"
            value={currentAnswer?.text_answer || ''}
            onChange={(e) => onAnswer(question.id, { question_id: question.id, text_answer: e.target.value, selected_option_ids: [] })}
            placeholder="Ketik jawaban singkat Anda..."
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-base font-medium text-slate-800 placeholder-slate-400 transition-all"
            autoFocus
          />
        </div>
      )}

      {/* ESSAY — Textarea */}
      {questionType === 'ESSAY' && (
        <div>
          <textarea
            value={currentAnswer?.text_answer || ''}
            onChange={(e) => onAnswer(question.id, { question_id: question.id, text_answer: e.target.value, selected_option_ids: [] })}
            placeholder="Tulis jawaban esai Anda di sini..."
            rows={8}
            className="w-full px-5 py-4 rounded-2xl border-2 border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-base font-medium text-slate-800 placeholder-slate-400 transition-all resize-y min-h-[150px]"
            autoFocus
          />
          <p className="text-xs text-slate-400 mt-2 text-right">
            {(currentAnswer?.text_answer || '').length} karakter
          </p>
        </div>
      )}
    </div>
  );
}
