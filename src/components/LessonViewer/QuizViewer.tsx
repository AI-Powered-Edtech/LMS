import { useState, useRef } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { motion } from 'motion/react';
import { quizService, type QuizAttemptResult } from '@/src/services/quizService';

interface QuizQuestion {
    id: string;
    text: string;
    order: number;
    quiz_options: { id: string; text: string }[];
}

interface QuizViewerProps {
    quizId: string;
    title: string;
    instructions: string | null;
    questions: QuizQuestion[];
    maxAttempts: number;
    isCompleted: boolean;
    onCompletionMet: () => void;
    onStartViewing: () => void;
}

export function QuizViewer({
    quizId,
    title,
    instructions,
    questions,
    maxAttempts,
    isCompleted,
    onCompletionMet,
    onStartViewing,
}: QuizViewerProps) {
    const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
    const [result, setResult] = useState<QuizAttemptResult | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const hasStarted = useRef(false);

    const handleSelectOption = async (questionId: string, optionId: string) => {
        if (!hasStarted.current) {
            hasStarted.current = true;
            onStartViewing();
            try {
                await quizService.startQuizAttempt(quizId);
            } catch (err) {
                console.error("Failed to start quiz:", err);
            }
        }
        setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    };

    const allAnswered = questions.every(q => selectedAnswers[q.id]);

    const handleSubmit = async () => {
        if (!allAnswered || isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const answers = Object.entries(selectedAnswers).map(([question_id, option_id]) => ({
                question_id,
                option_id,
            }));

            const gradeResult = await quizService.submitQuizAttempt(quizId, answers);
            setResult(gradeResult);

            if (gradeResult.passed) {
                onCompletionMet();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Gagal mengirim jawaban');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRetry = () => {
        setSelectedAnswers({});
        setResult(null);
        setError(null);
        hasStarted.current = false;
    };

    // Show result screen
    if (result) {
        return (
            <div className="p-6 md:p-8 max-w-2xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                        "rounded-2xl p-8 text-center border shadow-sm",
                        result.passed
                            ? "bg-green-50 border-green-200"
                            : "bg-red-50 border-red-200"
                    )}
                >
                    <div className={cn(
                        "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
                        result.passed ? "bg-green-100" : "bg-red-100"
                    )}>
                        {result.passed
                            ? <CheckCircle className="w-8 h-8 text-green-600" />
                            : <XCircle className="w-8 h-8 text-red-600" />
                        }
                    </div>

                    <h2 className="text-2xl font-bold text-slate-900 mb-2">
                        {result.passed ? 'Selamat! Kuis Lulus!' : 'Belum Lulus'}
                    </h2>

                    <div className="text-4xl font-bold mb-4" style={{ color: result.passed ? '#16a34a' : '#dc2626' }}>
                        {result.score}%
                    </div>

                    <p className="text-slate-600 text-sm mb-6">
                        {result.correct_answers} dari {result.total_questions} jawaban benar
                    </p>

                    {!result.passed && (
                        <button
                            onClick={handleRetry}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                        >
                            Coba Lagi
                        </button>
                    )}
                </motion.div>
            </div>
        );
    }

    // Show quiz form
    return (
        <div className="p-6 md:p-10 max-w-3xl mx-auto w-full h-full overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-2 text-orange-500 font-bold mb-2">
                <AlertTriangle className="w-5 h-5" />
                Kuis: {title}
            </div>

            {instructions && (
                <p className="text-slate-600 text-sm mb-8">{instructions}</p>
            )}

            <div className="space-y-6">
                {questions
                    .sort((a, b) => a.order - b.order)
                    .map((question, qIdx) => (
                        <div key={question.id} className="space-y-3">
                            <h3 className="font-bold text-slate-800">
                                {qIdx + 1}. {question.text}
                            </h3>
                            <div className="space-y-2">
                                {question.quiz_options.map(option => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleSelectOption(question.id, option.id)}
                                        className={cn(
                                            "w-full text-left p-3 rounded-xl border-2 transition-colors font-medium text-sm",
                                            selectedAnswers[question.id] === option.id
                                                ? "border-blue-500 bg-blue-50 text-blue-800"
                                                : "border-slate-100 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700"
                                        )}
                                    >
                                        {option.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
            </div>

            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <button
                onClick={handleSubmit}
                disabled={!allAnswered || isSubmitting}
                className={cn(
                    "w-full mt-6 py-3 rounded-xl font-bold text-white transition-colors",
                    allAnswered && !isSubmitting
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-slate-300 cursor-not-allowed"
                )}
            >
                {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Mengirim...
                    </span>
                ) : (
                    `Kirim Jawaban (${Object.keys(selectedAnswers).length}/${questions.length})`
                )}
            </button>
        </div>
    );
}
