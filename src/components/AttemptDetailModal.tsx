import { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { quizAnalyticsService, AttemptDetailAnswer } from '@/src/services/quizAnalyticsService';
import { cn } from '@/src/utils/cn';

interface AttemptDetailModalProps {
    attemptId: string;
    studentName: string;
    score: number | null;
    passed: boolean | null;
    onClose: () => void;
}

export function AttemptDetailModal({
    attemptId,
    studentName,
    score,
    passed,
    onClose,
}: AttemptDetailModalProps) {
    const [answers, setAnswers] = useState<AttemptDetailAnswer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function loadDetail() {
            setIsLoading(true);
            setError(null);
            try {
                const data = await quizAnalyticsService.getAttemptDetail(attemptId);
                setAnswers(data);
            } catch (err: any) {
                setError(err.message || 'Gagal memuat detail jawaban');
            } finally {
                setIsLoading(false);
            }
        }
        loadDetail();
    }, [attemptId]);

    const correctCount = answers.filter(a => a.is_correct).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col mx-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Detail Jawaban</h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-sm text-slate-500">{studentName}</span>
                            <span className="text-xs text-slate-300">•</span>
                            <span className={cn(
                                'text-sm font-bold',
                                passed ? 'text-emerald-600' : passed === false ? 'text-red-600' : 'text-slate-400'
                            )}>
                                Skor: {score ?? '-'}
                            </span>
                            {passed !== null && (
                                <span className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold',
                                    passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                )}>
                                    {passed ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                    {passed ? 'Lulus' : 'Tidak Lulus'}
                                </span>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span className="text-sm">Memuat jawaban...</span>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12 text-red-500 gap-2">
                            <AlertTriangle className="w-8 h-8 opacity-50" />
                            <p className="text-sm">{error}</p>
                        </div>
                    ) : answers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <p className="text-sm">Tidak ada data jawaban untuk percobaan ini.</p>
                        </div>
                    ) : (
                        answers.map((answer, idx) => (
                            <div
                                key={answer.question_id}
                                className={cn(
                                    'p-4 rounded-xl border',
                                    answer.is_correct
                                        ? 'bg-emerald-50/50 border-emerald-200'
                                        : 'bg-red-50/50 border-red-200'
                                )}
                            >
                                <div className="flex items-start justify-between gap-2 mb-3">
                                    <p className="text-sm font-semibold text-slate-800">
                                        <span className="text-slate-400 mr-1">
                                            {idx + 1}.
                                        </span>
                                        {answer.question_text}
                                    </p>
                                    <span className="shrink-0">
                                        {answer.is_correct ? (
                                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-500" />
                                        )}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-sm">
                                    {/* Student's answer */}
                                    <div className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-lg',
                                        answer.is_correct
                                            ? 'bg-emerald-100/70 text-emerald-800'
                                            : 'bg-red-100/70 text-red-800'
                                    )}>
                                        <span className="font-medium text-xs uppercase tracking-wide opacity-60">
                                            Jawaban Siswa:
                                        </span>
                                        <span className="font-semibold">
                                            {answer.selected_option_text || answer.text_answer || 'Tidak menjawab'}
                                        </span>
                                    </div>

                                    {/* Correct answer (only show if student got it wrong) */}
                                    {!answer.is_correct && answer.correct_option_text && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-100/40 text-emerald-700">
                                            <span className="font-medium text-xs uppercase tracking-wide opacity-60">
                                                Jawaban Benar:
                                            </span>
                                            <span className="font-semibold">
                                                {answer.correct_option_text}
                                            </span>
                                        </div>
                                    )}
                                    
                                    {/* Explanation */}
                                    {answer.explanation && (
                                        <div className="mt-3 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                                            <span className="font-bold text-xs uppercase tracking-wide text-blue-800 mb-1 block">
                                                Penjelasan:
                                            </span>
                                            <p className="text-sm text-blue-900/80 leading-relaxed">
                                                {answer.explanation}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {!isLoading && !error && answers.length > 0 && (
                    <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-sm text-slate-500">
                            {correctCount} dari {answers.length} soal benar
                        </span>
                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all',
                                    correctCount / answers.length >= 0.7 ? 'bg-emerald-500'
                                        : correctCount / answers.length >= 0.4 ? 'bg-amber-500'
                                            : 'bg-red-500'
                                )}
                                style={{ width: `${(correctCount / answers.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
