import { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, CheckCircle, AlertTriangle, Flag, ArrowLeft, Send } from 'lucide-react';
import { SubmitAnswer } from '@/src/features/quizzes';
import { QuestionPalette } from './QuestionPalette';
import { cn } from '@/src/utils/cn';

interface QuizReviewScreenProps {
  questions: any[];
  answers: Record<string, SubmitAnswer>;
  flagged: Set<string>;
  onBack: () => void;
  onSubmit: () => void;
  onJump: (index: number) => void;
  isSubmitting: boolean;
}

export function QuizReviewScreen({
  questions,
  answers,
  flagged,
  onBack,
  onSubmit,
  onJump,
  isSubmitting,
}: QuizReviewScreenProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  // Calculate stats
  const totalQuestions = questions.length;
  const answeredCount = questions.filter(q => {
    const qType = q.question_type || 'MCQ';
    return ['SHORT_ANSWER', 'ESSAY'].includes(qType)
      ? !!answers[q.id]?.text_answer?.trim()
      : (answers[q.id]?.selected_option_ids?.length ?? 0) > 0;
  }).length;
  
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = flagged.size;

  const handleFinalSubmit = () => {
    if (unansweredCount > 0 && !showConfirm) {
      setShowConfirm(true);
      return;
    }
    onSubmit();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 flex-1 w-full pb-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Review Jawaban</h1>
          <p className="text-sm font-medium text-slate-500">
            Periksa kembali jawaban Anda sebelum mengirim
          </p>
        </div>
      </div>

      {unansweredCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-amber-800">Anda masih memiliki {unansweredCount} soal yang belum dijawab</h4>
            <p className="text-sm text-amber-700 mt-1">
              Sebaiknya Anda menjawab semua soal. Klik nomor soal di bawah untuk mengerjakannya.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{answeredCount}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dijawab</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Target className="w-6 h-6 text-slate-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{unansweredCount}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Belum Dijawab</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
            <Flag className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-800">{flaggedCount}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ditandai</p>
          </div>
        </div>
      </div>

      {/* Ringkasan Jawaban */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Ringkasan Jawaban</h3>
        <div className="max-h-80 overflow-y-auto space-y-3">
          {questions.map((q, i) => {
            const qType = q.question_type || 'MCQ';
            const isAnswered = ['SHORT_ANSWER', 'ESSAY'].includes(qType)
              ? !!answers[q.id]?.text_answer?.trim()
              : (answers[q.id]?.selected_option_ids?.length ?? 0) > 0;
            const isFlagged = flagged.has(q.id);
            
            // Get answer preview
            let answerPreview: string;
            if (!isAnswered) {
              answerPreview = 'Belum dijawab';
            } else if (['SHORT_ANSWER', 'ESSAY'].includes(qType)) {
              answerPreview = answers[q.id]?.text_answer?.substring(0, 80) || '';
              if (answers[q.id]?.text_answer?.length > 80) answerPreview += '...';
            } else {
              // MCQ, TRUE_FALSE, MULTIPLE_SELECT - find matching options
              const selectedIds = answers[q.id]?.selected_option_ids || [];
              const selectedOptions = q.quiz_options?.filter((opt: any) => selectedIds.includes(opt.id)) || [];
              answerPreview = selectedOptions.map((opt: any) => opt.text).join(', ');
            }

            const questionText = q.text?.substring(0, 60) || `Soal ${i + 1}`;
            const truncatedQuestion = q.text?.length > 60 ? questionText + '...' : questionText;

            return (
              <button
                key={q.id}
                onClick={() => onJump(i)}
                className={cn(
                  "w-full text-left p-4 rounded-xl border-l-4 transition-all hover:shadow-md",
                  isAnswered 
                    ? "border-l-green-500 bg-green-50/50 hover:bg-green-50" 
                    : "border-l-amber-500 bg-amber-50/50 hover:bg-amber-50",
                  "dark:bg-slate-800/50 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-start gap-2">
                  <span className={cn(
                    "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold",
                    isAnswered 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {truncatedQuestion}
                      </span>
                      {isFlagged && (
                        <Flag className="w-4 h-4 text-yellow-500 shrink-0" />
                      )}
                    </div>
                    <p className={cn(
                      "text-xs mt-1",
                      !isAnswered && "italic text-amber-600 dark:text-amber-400",
                      isAnswered ? "text-slate-600 dark:text-slate-400" : ""
                    )}>
                      {answerPreview}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Navigasi Soal</h3>
        <QuestionPalette
          questions={questions}
          currentQuestionIdx={-1}
          answers={answers}
          flagged={flagged}
          onJump={onJump}
        />
      </div>

      {showConfirm && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 p-6 rounded-2xl text-center"
        >
          <h3 className="text-lg font-bold text-red-800 mb-2">Apakah Anda yakin ingin mengirim kuis sekarang?</h3>
          <p className="text-red-600 mb-6">Anda masih memiliki soal yang belum dijawab. Jawaban tidak dapat diubah setelah kuis dikirim.</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-6 py-2 rounded-xl font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 border-2"
            >
              Batal
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
            >
              {isSubmitting ? 'Mengirim...' : 'Ya, Kirim Sekarang'}
            </button>
          </div>
        </motion.div>
      )}

      {!showConfirm && (
        <div className="flex justify-end pt-4">
          <button
            onClick={handleFinalSubmit}
            disabled={isSubmitting}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isSubmitting ? 'Mengirim...' : 'Submit Quiz'}
            <Send className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
