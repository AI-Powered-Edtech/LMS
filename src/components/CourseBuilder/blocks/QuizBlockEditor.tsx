import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Trash2, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useBuilder } from '@/src/contexts/BuilderContext';
import { courseBuilderService, type QuizBlockData } from '@/src/services/courseBuilderService';
import { cn } from '@/src/utils/cn';

type QuizStatus = 'draft' | 'published' | 'archived';

export function QuizBlockEditor({ blockId }: { blockId: string }) {
    const { state } = useBuilder();
    const activeLesson = state.modules
        .flatMap(m => m.lessons)
        .find(l => l.id === state.activeLesson?.id);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedQuizId, setSavedQuizId] = useState<string | undefined>(undefined);
    const [quizStatus, setQuizStatus] = useState<QuizStatus>('draft');

    const [quizData, setQuizData] = useState<QuizBlockData>({
        title: 'Kuis Baru',
        instructions: '',
        max_attempts: 1,
        passing_score: 70,
        shuffle_questions: false,
        shuffle_options: false,
        status: 'draft',
        questions: []
    });

    useEffect(() => {
        if (!activeLesson) return;
        async function load() {
            try {
                const data = await courseBuilderService.getQuizByLesson(activeLesson!.id);
                if (data) {
                    setSavedQuizId(data.id);
                    setQuizStatus((data.status as QuizStatus) || 'draft');
                    setQuizData({
                        id: data.id,
                        title: data.title || '',
                        instructions: data.instructions || '',
                        max_attempts: data.max_attempts || 1,
                        passing_score: data.passing_score || 70,
                        shuffle_questions: data.shuffle_questions || false,
                        shuffle_options: data.shuffle_options || false,
                        status: data.status || 'draft',
                        questions: (data.quiz_questions || [])
                            .sort((a: any, b: any) => a.order - b.order)
                            .map((q: any) => ({
                                id: q.id,
                                text: q.text,
                                order: q.order,
                                options: q.quiz_options || []
                            }))
                    });
                }
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
        load();
    }, [activeLesson?.id]);

    const handleSave = async (targetStatus: QuizStatus = quizStatus) => {
        if (!activeLesson) return;
        setIsSaving(true);
        setError(null);
        try {
            const payload: QuizBlockData = {
                ...quizData,
                id: savedQuizId,
                status: targetStatus,
            };
            const result = await courseBuilderService.saveQuizData(
                activeLesson.id,
                state.courseId ?? '',
                activeLesson.tenantId,
                payload
            );
            setSavedQuizId(result.quiz_id);
            setQuizStatus(targetStatus);
            setQuizData(prev => ({ ...prev, id: result.quiz_id, status: targetStatus }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
            setIsPublishing(false);
        }
    };

    const handlePublishToggle = async () => {
        setIsPublishing(true);
        const next: QuizStatus = quizStatus === 'published' ? 'draft' : 'published';
        await handleSave(next);
    };

    const addQuestion = () => {
        setQuizData(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    text: '',
                    order: prev.questions.length + 1,
                    options: [
                        { text: 'Opsi A', is_correct: true },
                        { text: 'Opsi B', is_correct: false }
                    ]
                }
            ]
        }));
    };

    const updateQuestion = (idx: number, text: string) => {
        const qs = [...quizData.questions];
        qs[idx] = { ...qs[idx], text };
        setQuizData({ ...quizData, questions: qs });
    };

    const removeQuestion = (idx: number) => {
        const qs = [...quizData.questions];
        qs.splice(idx, 1);
        setQuizData({ ...quizData, questions: qs });
    };

    const addOption = (qIdx: number) => {
        const qs = [...quizData.questions];
        qs[qIdx].options.push({ text: 'Opsi Baru', is_correct: false });
        setQuizData({ ...quizData, questions: qs });
    };

    const updateOption = (qIdx: number, oIdx: number, text: string) => {
        const qs = [...quizData.questions];
        qs[qIdx].options[oIdx].text = text;
        setQuizData({ ...quizData, questions: qs });
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        const qs = [...quizData.questions];
        qs[qIdx].options.splice(oIdx, 1);
        setQuizData({ ...quizData, questions: qs });
    };

    const setCorrectOption = (qIdx: number, oIdx: number) => {
        const qs = [...quizData.questions];
        qs[qIdx].options.forEach((o, i) => { o.is_correct = (i === oIdx); });
        setQuizData({ ...quizData, questions: qs });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Memuat data kuis...</span>
            </div>
        );
    }

    const isPublished = quizStatus === 'published';

    return (
        <div className="w-full space-y-6">
            {/* Header with status */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                        <HelpCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Quiz Editor</h3>
                        <span className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5',
                            isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        )}>
                            {isPublished ? <CheckCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                            {isPublished ? 'Published' : 'Draft'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                        {isSaving && !isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Simpan Draft
                    </button>
                    <button
                        onClick={handlePublishToggle}
                        disabled={isSaving}
                        className={cn(
                            'px-3 py-1.5 text-sm font-bold rounded-lg transition-colors flex items-center gap-1.5',
                            isPublished
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                        )}
                    >
                        {isPublishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {isPublished ? 'Kembalikan ke Draft' : 'Publish Kuis'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Quiz Settings */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Judul Kuis</label>
                    <input
                        type="text"
                        value={quizData.title}
                        onChange={e => setQuizData({ ...quizData, title: e.target.value })}
                        disabled={isPublished}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Masukkan judul kuis..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Instruksi</label>
                    <textarea
                        value={quizData.instructions || ''}
                        onChange={e => setQuizData({ ...quizData, instructions: e.target.value })}
                        disabled={isPublished}
                        rows={2}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Masukkan instruksi pengerjaan..."
                    />
                </div>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maks. Percobaan</label>
                        <input
                            type="number" min="1" max="10"
                            value={quizData.max_attempts}
                            onChange={e => setQuizData({ ...quizData, max_attempts: parseInt(e.target.value) })}
                            disabled={isPublished}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Nilai Lulus (%)</label>
                        <input
                            type="number" min="0" max="100"
                            value={quizData.passing_score}
                            onChange={e => setQuizData({ ...quizData, passing_score: parseInt(e.target.value) })}
                            disabled={isPublished}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                    </div>
                    <div className="flex flex-col justify-end gap-2 pb-0.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={quizData.shuffle_questions}
                                onChange={e => setQuizData({ ...quizData, shuffle_questions: e.target.checked })}
                                disabled={isPublished}
                                className="w-4 h-4 rounded accent-blue-600"
                            />
                            <span className="text-xs text-slate-600 font-medium">Acak soal</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={quizData.shuffle_options}
                                onChange={e => setQuizData({ ...quizData, shuffle_options: e.target.checked })}
                                disabled={isPublished}
                                className="w-4 h-4 rounded accent-blue-600"
                            />
                            <span className="text-xs text-slate-600 font-medium">Acak opsi</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-sm">
                        Daftar Pertanyaan
                        <span className="ml-2 text-xs font-normal text-slate-400">({quizData.questions.length} soal)</span>
                    </h4>
                    {!isPublished && (
                        <button
                            onClick={addQuestion}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5" /> Tambah Soal
                        </button>
                    )}
                </div>

                {quizData.questions.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">Belum ada soal.</p>
                        <p className="text-xs text-slate-400 mt-1">Klik "Tambah Soal" untuk mulai membuat pertanyaan.</p>
                    </div>
                ) : (
                    quizData.questions.map((q, qIdx) => (
                        <div key={q.id || qIdx} className="p-4 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-3 group relative">
                            {/* Question number + delete */}
                            <div className="flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                                    {qIdx + 1}
                                </span>
                                <input
                                    type="text"
                                    value={q.text}
                                    onChange={e => updateQuestion(qIdx, e.target.value)}
                                    disabled={isPublished}
                                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm disabled:opacity-60"
                                    placeholder="Tulis pertanyaan di sini..."
                                />
                                {!isPublished && (
                                    <button
                                        onClick={() => removeQuestion(qIdx)}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Options */}
                            <div className="pl-8 space-y-2">
                                {q.options.map((opt, oIdx) => (
                                    <div key={oIdx} className="flex items-center gap-2">
                                        <button
                                            onClick={() => !isPublished && setCorrectOption(qIdx, oIdx)}
                                            disabled={isPublished}
                                            title={opt.is_correct ? 'Jawaban benar' : 'Jadikan jawaban benar'}
                                            className={cn(
                                                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
                                                opt.is_correct
                                                    ? 'border-emerald-500 bg-emerald-500'
                                                    : 'border-slate-300 bg-white hover:border-emerald-400',
                                                isPublished && 'cursor-not-allowed'
                                            )}
                                        >
                                            {opt.is_correct && (
                                                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 12 12">
                                                    <path d="M10 3L5 8.5 2 5.5l-1 1L5 10.5l6-7-1-0.5z" />
                                                </svg>
                                            )}
                                        </button>
                                        <input
                                            type="text"
                                            value={opt.text}
                                            onChange={e => updateOption(qIdx, oIdx, e.target.value)}
                                            disabled={isPublished}
                                            className={cn(
                                                'flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400 transition-colors',
                                                opt.is_correct
                                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                    : 'bg-slate-50 border-slate-200',
                                                isPublished && 'opacity-60 cursor-not-allowed'
                                            )}
                                            placeholder="Teks opsi..."
                                        />
                                        {!isPublished && q.options.length > 2 && (
                                            <button
                                                onClick={() => removeOption(qIdx, oIdx)}
                                                className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                                {!isPublished && (
                                    <button
                                        onClick={() => addOption(qIdx)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Tambah Opsi
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {isPublished && (
                <p className="text-xs text-center text-slate-400 pb-2">
                    Kuis sudah dipublish. Kembalikan ke Draft untuk mengedit soal.
                </p>
            )}
        </div>
    );
}
