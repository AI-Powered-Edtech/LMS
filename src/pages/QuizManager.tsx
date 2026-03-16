import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Plus, Trash2, Loader2, CheckCircle, AlertTriangle,
    Search, HelpCircle, Clock, Pencil, X,
    Save, Globe, Lock, Copy, Link as LinkIcon, Users, Calendar
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { quizService, type QuestionType, type QuizMode } from '@/src/services/quizService';
import { QuestionSearchModal } from '@/src/features/question-bank/components/QuestionSearchModal';
import { useClassroom } from '@/src/contexts/ClassroomContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/lib/supabase';
import { QuizAssignModal } from '@/src/components/Quiz/QuizAssignModal';
import { QuizAssignmentStatus } from '@/src/components/Quiz/QuizAssignmentStatus';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

type QuizStatus = 'draft' | 'published' | 'archived';

interface QuizListItem {
    id: string;
    title: string;
    status: QuizStatus;
    mode: QuizMode;
    time_limit_minutes: number | null;
    max_attempts: number;
    passing_score: number;
    question_count: number;
    assignment_count?: number;
    created_at: string;
    updated_at: string;
}

interface QuizQuestion {
    id?: string;
    text: string;
    order: number;
    question_type: QuestionType;
    points: number;
    explanation: string | null;
    tenant_id?: string;
    options: { id?: string; text: string; is_correct: boolean }[];
}

interface QuizFormData {
    id?: string;
    title: string;
    instructions: string;
    mode: QuizMode;
    time_limit_minutes: number | null;
    max_attempts: number;
    passing_score: number;
    shuffle_questions: boolean;
    shuffle_options: boolean;
    show_correct_answers: boolean;
    available_from: string;
    due_at: string;
    status: QuizStatus;
    questions: QuizQuestion[];
}

const emptyForm: QuizFormData = {
    title: '',
    instructions: '',
    mode: 'graded',
    time_limit_minutes: 15,
    max_attempts: 3,
    passing_score: 70,
    shuffle_questions: false,
    shuffle_options: false,
    show_correct_answers: false,
    available_from: '',
    due_at: '',
    status: 'draft',
    questions: [],
};

const questionTypeLabels: Record<string, string> = {
    MCQ: 'Pilihan Ganda',
    TRUE_FALSE: 'Benar/Salah',
    MULTIPLE_SELECT: 'Pilih Beberapa',
    SHORT_ANSWER: 'Jawaban Singkat',
    ESSAY: 'Esai',
};

const modeLabels: Record<string, string> = {
    practice: 'Latihan',
    graded: 'Penilaian',
    exam: 'Ujian',
};

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

export function QuizManager() {
    const { activeClassroomId, classrooms } = useClassroom();
    const { tenantId } = useAuth();
    
    const activeClass = classrooms.find(c => c.id === activeClassroomId);

    const [studentCount, setStudentCount] = useState<number>(0);

    useEffect(() => {
        if (activeClassroomId && tenantId) {
            supabase
                .from('enrollments')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', activeClassroomId)
                .eq('tenant_id', tenantId)
                .eq('status', 'ACTIVE')
                .then(({ count }) => {
                    setStudentCount(count || 0);
                });
        }
    }, [activeClassroomId, tenantId]);

    // Views: 'list' | 'editor'
    const [view, setView] = useState<'list' | 'editor'>('list');
    const [activeTab, setActiveTab] = useState<'class' | 'library'>('class');
    const [assignModalQuizId, setAssignModalQuizId] = useState<string | null>(null);
    const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
    const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

    // Editor state
    const [form, setForm] = useState<QuizFormData>(emptyForm);
    const [isSaving, setIsSaving] = useState(false);
    const [showQuestionModal, setShowQuestionModal] = useState(false);

    // ─── List Loading ──────────────────────────────────────

    const loadQuizzes = useCallback(async () => {
        if (!activeClassroomId || !tenantId) return;
        setIsLoading(true);
        setError(null);
        try {
            let data;
            if (activeTab === 'class') {
                data = await quizService.getQuizzesByClass(activeClassroomId);
            } else {
                data = await quizService.getTeacherQuizzes(tenantId);
            }
            setQuizzes(data as QuizListItem[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [activeClassroomId, tenantId, activeTab]);

    useEffect(() => {
        loadQuizzes();
    }, [loadQuizzes]);

    // ─── Open Editor ────────────────────────────────────────

    const openNewQuiz = () => {
        setForm(emptyForm);
        setEditingQuizId(null);
        setView('editor');
    };

    const openEditQuiz = async (quizId: string) => {
        setIsLoading(true);
        try {
            const data = await quizService.getQuizWithQuestions(quizId);
            if (!data) throw new Error('Quiz not found');

            setForm({
                id: data.id,
                title: data.title || '',
                instructions: data.instructions || '',
                mode: data.mode || 'graded',
                time_limit_minutes: data.time_limit_minutes,
                max_attempts: data.max_attempts || 3,
                passing_score: data.passing_score || 70,
                shuffle_questions: data.shuffle_questions || false,
                shuffle_options: data.shuffle_options || false,
                show_correct_answers: data.show_correct_answers || false,
                available_from: data.available_from || '',
                due_at: data.available_until || '',
                status: data.status || 'draft',
                questions: (data.quiz_questions || []).map((q: any) => ({
                    id: q.id,
                    text: q.text,
                    order: q.order,
                    question_type: q.question_type || 'MCQ',
                    points: q.points ?? 1,
                    explanation: q.explanation || null,
                    tenant_id: q.tenant_id,
                    options: (q.quiz_options || []).map((o: any) => ({
                        id: o.id,
                        text: o.text,
                        is_correct: o.is_correct,
                    })),
                })),
            });
            setEditingQuizId(quizId);
            setView('editor');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // ─── Save Quiz ──────────────────────────────────────────

    const handleSave = async (targetStatus?: QuizStatus) => {
        if (!activeClassroomId || !tenantId) return;
        // Prevent publishing without questions
        if (targetStatus === 'published' && form.questions.length === 0) {
            setError('Tidak bisa publish kuis tanpa soal. Tambahkan minimal 1 soal.');
            return;
        }
        setIsSaving(true);
        setError(null);

        const status = targetStatus || form.status;

        try {
            let quizId = editingQuizId;

            if (!quizId) {
                // Create new quiz
                const created = await quizService.createQuiz({
                    title: form.title || 'Kuis Baru',
                    class_id: activeClassroomId,
                    tenant_id: tenantId,
                    instructions: form.instructions,
                    mode: form.mode,
                    time_limit_minutes: form.time_limit_minutes || undefined,
                    max_attempts: form.max_attempts,
                    passing_score: form.passing_score,
                    shuffle_questions: form.shuffle_questions,
                    shuffle_options: form.shuffle_options,
                    show_correct_answers: form.show_correct_answers,
                    available_from: form.available_from || null,
                    due_at: form.due_at || null,
                });
                quizId = created.id;
                setEditingQuizId(quizId);
                setForm(prev => ({ ...prev, id: quizId! }));
            } else {
                // Update existing quiz settings
                await quizService.updateQuiz(quizId, {
                    title: form.title,
                    instructions: form.instructions || null,
                    mode: form.mode,
                    time_limit_minutes: form.time_limit_minutes,
                    max_attempts: form.max_attempts,
                    passing_score: form.passing_score,
                    shuffle_questions: form.shuffle_questions,
                    shuffle_options: form.shuffle_options,
                    show_correct_answers: form.show_correct_answers,
                    available_from: form.available_from || null,
                    available_until: form.due_at || null,
                    status,
                });
            }

            // Sync questions: delete removed, update existing, add new
            const existingQs = form.questions.filter(q => q.id);
            const newQs = form.questions.filter(q => !q.id);

            // For existing questions, update text/type/points and replace options
            for (const q of existingQs) {
                await quizService.updateQuizQuestion(q.id!, {
                    text: q.text,
                    question_type: q.question_type,
                    points: q.points,
                    explanation: q.explanation,
                    order: q.order,
                });
                await quizService.replaceQuestionOptions(
                    q.id!,
                    tenantId,
                    q.options.map(o => ({ text: o.text, is_correct: o.is_correct }))
                );
            }

            // Add new questions
            for (const q of newQs) {
                await quizService.addQuestionToQuiz(quizId, tenantId, {
                    text: q.text,
                    question_type: q.question_type,
                    points: q.points,
                    explanation: q.explanation || undefined,
                    order: q.order,
                    options: q.options.map(o => ({ text: o.text, is_correct: o.is_correct })),
                });
            }

            // Set status if publishing
            if (targetStatus && (targetStatus === 'draft' || targetStatus === 'published')) {
                await quizService.setQuizStatus(quizId, targetStatus);
                setForm(prev => ({ ...prev, status: targetStatus }));
            }

            // Reload editor with fresh data
            await openEditQuiz(quizId);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    // ─── Delete Quiz ────────────────────────────────────────

    const handleDelete = async (quizId: string) => {
        if (!confirm('Hapus kuis ini? Aksi ini tidak bisa dibatalkan.')) return;
        try {
            await quizService.deleteQuiz(quizId);
            setQuizzes(prev => prev.filter(q => q.id !== quizId));
        } catch (err: any) {
            setError(err.message);
        }
    };

    // ─── Question CRUD (local state) ────────────────────────

    const addQuestion = () => {
        setForm(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    text: '',
                    order: prev.questions.length + 1,
                    question_type: 'MCQ' as QuestionType,
                    points: 1,
                    explanation: null,
                    options: [
                        { text: 'Opsi A', is_correct: true },
                        { text: 'Opsi B', is_correct: false },
                    ],
                },
            ],
        }));
    };

    const updateQuestion = <K extends keyof QuizQuestion>(idx: number, field: K, value: QuizQuestion[K]) => {
        const qs = [...form.questions];
        qs[idx][field] = value;
        setForm({ ...form, questions: qs });
    };

    const removeQuestion = (idx: number) => {
        const qs = [...form.questions];
        qs.splice(idx, 1);
        // Reorder
        qs.forEach((q, i) => { q.order = i + 1; });
        setForm({ ...form, questions: qs });
    };

    const updateQuestionType = (qIdx: number, newType: QuestionType) => {
        const qs = [...form.questions];
        qs[qIdx].question_type = newType;
        if (newType === 'TRUE_FALSE') {
            qs[qIdx].options = [
                { text: 'Benar', is_correct: true },
                { text: 'Salah', is_correct: false },
            ];
        } else if (newType === 'SHORT_ANSWER' || newType === 'ESSAY') {
            qs[qIdx].options = [];
        } else if (qs[qIdx].options.length === 0) {
            qs[qIdx].options = [
                { text: 'Opsi A', is_correct: true },
                { text: 'Opsi B', is_correct: false },
            ];
        }
        setForm({ ...form, questions: qs });
    };

    const addOption = (qIdx: number) => {
        const qs = [...form.questions];
        qs[qIdx].options.push({ text: 'Opsi Baru', is_correct: false });
        setForm({ ...form, questions: qs });
    };

    const updateOption = (qIdx: number, oIdx: number, text: string) => {
        const qs = [...form.questions];
        qs[qIdx].options[oIdx].text = text;
        setForm({ ...form, questions: qs });
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        const qs = [...form.questions];
        qs[qIdx].options.splice(oIdx, 1);
        setForm({ ...form, questions: qs });
    };

    const setCorrectOption = (qIdx: number, oIdx: number) => {
        const qs = [...form.questions];
        const qType = qs[qIdx].question_type;
        if (qType === 'MULTIPLE_SELECT') {
            qs[qIdx].options[oIdx].is_correct = !qs[qIdx].options[oIdx].is_correct;
        } else {
            qs[qIdx].options.forEach((o, i) => { o.is_correct = i === oIdx; });
        }
        setForm({ ...form, questions: qs });
    };

    const isPublished = form.status === 'published';

    // ─── No class selected ──────────────────────────────────

    if (!activeClassroomId) {
        return (
            <div className="max-w-4xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-4">Manajemen Kuis</h1>
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-medium text-slate-500">Pilih kelas terlebih dahulu</p>
                    <p className="text-sm mt-1 text-slate-400">Gunakan sidebar untuk memilih kelas aktif.</p>
                </div>
            </div>
        );
    }

    // ─── QUIZ LIST VIEW ─────────────────────────────────────

    if (view === 'list') {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                            <Link to="/teacher-dashboard" className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
                                <ArrowLeft className="w-5 h-5" />
                            </Link>
                            Manajemen Kuis
                        </h1>
                        <p className="text-slate-500 mt-1 ml-9 text-sm">
                            Buat, kelola, dan publish kuis untuk kelas Anda
                        </p>
                    </div>
                    <button
                        onClick={openNewQuiz}
                        className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Buat Kuis Baru
                    </button>
                </div>

                {/* Class Join Code Header */}
                {activeClass && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Class</p>
                            <h2 className="text-lg font-bold text-indigo-950">{activeClass.name}</h2>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 bg-white py-3 px-4 rounded-xl border border-indigo-100/50">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Students</p>
                                <div className="flex items-center gap-1.5">
                                    <Users className="w-4 h-4 text-indigo-500" />
                                    <p className="text-xl font-black text-slate-800">{studentCount}</p>
                                </div>
                            </div>
                            <div className="h-full w-px bg-slate-100 hidden sm:block"></div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Join Code</p>
                                <p className="text-xl font-black text-slate-800 tracking-widest">{activeClass.join_code}</p>
                            </div>
                            <div className="h-full w-px bg-slate-100 hidden sm:block"></div>
                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(activeClass.join_code);
                                        alert('Kode berhasil disalin!');
                                    }}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors"
                                >
                                    <Copy className="w-3.5 h-3.5" />
                                    Copy Code
                                </button>
                                <button
                                    onClick={() => {
                                        const url = `${window.location.origin}/dashboard?join=${activeClass.join_code}`;
                                        navigator.clipboard.writeText(url);
                                        alert('Link berhasil disalin!');
                                    }}
                                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs rounded-lg border border-slate-200 transition-colors"
                                >
                                    <LinkIcon className="w-3.5 h-3.5" />
                                    Copy Link
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('class')}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'class'
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        )}
                    >
                        Kuis Kelas Ini
                    </button>
                    <button
                        onClick={() => setActiveTab('library')}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all",
                            activeTab === 'library'
                                ? "bg-white text-indigo-600 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        )}
                    >
                        Semua Kuis (Bank Kuis)
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {error}
                    </div>
                )}

                {/* Quiz Cards */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Memuat kuis...</span>
                    </div>
                ) : quizzes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                        <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">Belum ada kuis</p>
                        <p className="text-sm mt-1">Klik "Buat Kuis Baru" untuk memulai.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {quizzes.map(quiz => (
                            <div
                                key={quiz.id}
                                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group cursor-pointer"
                                onClick={() => openEditQuiz(quiz.id)}
                            >
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 truncate">{quiz.title}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={cn(
                                                'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full',
                                                quiz.status === 'published'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-amber-100 text-amber-700'
                                            )}>
                                                {quiz.status === 'published' ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                                {quiz.status === 'published' ? 'Published' : 'Draft'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                {modeLabels[quiz.mode] || quiz.mode}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {activeTab === 'library' && quiz.status === 'published' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setAssignModalQuizId(quiz.id);
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Assign ke Kelas"
                                            >
                                                <Calendar className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openEditQuiz(quiz.id); }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Edit"
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        {quiz.status === 'draft' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(quiz.id); }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 text-xs text-slate-500">
                                    <span className="flex items-center gap-1">
                                        <HelpCircle className="w-3.5 h-3.5" />
                                        {quiz.question_count} soal
                                    </span>
                                    {quiz.time_limit_minutes && (
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {quiz.time_limit_minutes} menit
                                        </span>
                                    )}
                                    <span>Maks. {quiz.max_attempts}x</span>
                                    <span>Lulus: {quiz.passing_score}%</span>
                                </div>
                                
                                {activeTab === 'library' && (
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedQuizId(expandedQuizId === quiz.id ? null : quiz.id);
                                            }}
                                            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-between w-full"
                                        >
                                            <span>Assignment Status ({(quiz as any).assignment_count || 0} kelas)</span>
                                            <ArrowLeft className={cn("w-3 h-3 transition-transform", expandedQuizId === quiz.id ? "rotate-90" : "-rotate-90")} />
                                        </button>
                                        
                                        {expandedQuizId === quiz.id && (
                                            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                                                <QuizAssignmentStatus 
                                                    quizId={quiz.id} 
                                                    onAssignClick={() => setAssignModalQuizId(quiz.id)} 
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {assignModalQuizId && (
                    <QuizAssignModal
                        quizId={assignModalQuizId}
                        isOpen={true}
                        onClose={() => setAssignModalQuizId(null)}
                        onSuccess={() => {
                            setAssignModalQuizId(null);
                            loadQuizzes();
                        }}
                    />
                )}
            </div>
        );
    }

    // ─── QUIZ EDITOR VIEW ───────────────────────────────────

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Editor Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setView('list'); loadQuizzes(); }}
                        className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="font-bold text-xl text-slate-900">
                            {editingQuizId ? 'Edit Kuis' : 'Buat Kuis Baru'}
                        </h2>
                        {isPublished && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 mt-0.5">
                                <CheckCircle className="w-3 h-3" />
                                Published
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => handleSave()}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
                    >
                        {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        <Save className="w-3.5 h-3.5" />
                        Simpan Draft
                    </button>
                    <button
                        onClick={() => handleSave(isPublished ? 'draft' : 'published')}
                        disabled={isSaving}
                        className={cn(
                            'px-4 py-2 text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5',
                            isPublished
                                ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                                : 'text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                        )}
                    >
                        {isPublished ? 'Kembalikan ke Draft' : 'Publish Kuis'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                    <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
            )}

            {/* Quiz Settings */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Pengaturan Kuis</h3>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Judul Kuis</label>
                    <input
                        type="text"
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        disabled={isPublished}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-60 text-sm"
                        placeholder="Masukkan judul kuis..."
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Instruksi</label>
                    <textarea
                        value={form.instructions}
                        onChange={e => setForm({ ...form, instructions: e.target.value })}
                        disabled={isPublished}
                        rows={2}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none disabled:opacity-60 text-sm"
                        placeholder="Instruksi pengerjaan kuis..."
                    />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Mode</label>
                        <select
                            value={form.mode}
                            onChange={e => setForm({ ...form, mode: e.target.value as QuizMode })}
                            disabled={isPublished}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        >
                            <option value="practice">Latihan</option>
                            <option value="graded">Penilaian</option>
                            <option value="exam">Ujian</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Waktu (menit)</label>
                        <input
                            type="number" min="0" max="300"
                            value={form.time_limit_minutes || ''}
                            onChange={e => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || null })}
                            disabled={isPublished}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            placeholder="0 = tanpa batas"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Maks. Percobaan</label>
                        <input
                            type="number" min="1" max="10"
                            value={form.max_attempts}
                            onChange={e => setForm({ ...form, max_attempts: parseInt(e.target.value) || 1 })}
                            disabled={isPublished}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Nilai Lulus (%)</label>
                        <input
                            type="number" min="0" max="100"
                            value={form.passing_score}
                            onChange={e => setForm({ ...form, passing_score: parseInt(e.target.value) || 0 })}
                            disabled={isPublished}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-2">
                    {[
                        { key: 'shuffle_questions', label: 'Acak soal' },
                        { key: 'shuffle_options', label: 'Acak opsi' },
                        { key: 'show_correct_answers', label: 'Tampilkan jawaban benar' },
                    ].map(item => (
                        <label key={item.key} className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={(form as any)[item.key]}
                                onChange={e => setForm({ ...form, [item.key]: e.target.checked })}
                                disabled={isPublished}
                                className="w-4 h-4 rounded accent-blue-600"
                            />
                            <span className="text-xs text-slate-600 font-medium">{item.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Questions Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                        Daftar Soal
                        <span className="ml-2 text-xs font-normal text-slate-400">({form.questions.length} soal)</span>
                    </h3>
                    {!isPublished && (
                        <div className="flex items-center gap-2">
                            {editingQuizId && (
                                <button
                                    onClick={() => setShowQuestionModal(true)}
                                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                                >
                                    <Search className="w-3.5 h-3.5" /> Bank Soal
                                </button>
                            )}
                            <button
                                onClick={addQuestion}
                                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold rounded-lg text-xs flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Tambah Soal
                            </button>
                        </div>
                    )}
                </div>

                {form.questions.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl">
                        <HelpCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">Belum ada soal.</p>
                        <p className="text-xs text-slate-400 mt-1">Klik "Tambah Soal" untuk mulai membuat pertanyaan.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {form.questions.map((q, qIdx) => (
                            <div key={q.id || `new-${qIdx}`} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
                                {/* Question header */}
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
                                        {qIdx + 1}
                                    </span>
                                    <select
                                        value={q.question_type}
                                        onChange={e => updateQuestionType(qIdx, e.target.value as QuestionType)}
                                        disabled={isPublished}
                                        className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 font-medium disabled:opacity-60"
                                    >
                                        {Object.entries(questionTypeLabels).map(([val, label]) => (
                                            <option key={val} value={val}>{label}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="number" min="1" max="100"
                                        value={q.points}
                                        onChange={e => updateQuestion(qIdx, 'points', parseInt(e.target.value) || 1)}
                                        disabled={isPublished}
                                        className="w-14 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
                                        title="Poin"
                                    />
                                    <span className="text-[10px] text-slate-400">poin</span>
                                    <input
                                        type="text"
                                        value={q.text}
                                        onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                                        disabled={isPublished}
                                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm disabled:opacity-60"
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
                                {q.question_type !== 'SHORT_ANSWER' && q.question_type !== 'ESSAY' && (
                                    <div className="pl-8 space-y-2">
                                        {q.question_type === 'MULTIPLE_SELECT' && (
                                            <p className="text-[10px] text-slate-400 italic">Klik untuk toggle jawaban benar (bisa lebih dari 1)</p>
                                        )}
                                        {q.options.map((opt, oIdx) => (
                                            <div key={oIdx} className="flex items-center gap-2">
                                                <button
                                                    onClick={() => !isPublished && setCorrectOption(qIdx, oIdx)}
                                                    disabled={isPublished}
                                                    className={cn(
                                                        'w-5 h-5 border-2 flex items-center justify-center shrink-0 transition-colors',
                                                        q.question_type === 'MULTIPLE_SELECT' ? 'rounded' : 'rounded-full',
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
                                                    disabled={isPublished || q.question_type === 'TRUE_FALSE'}
                                                    className={cn(
                                                        'flex-1 px-3 py-1.5 text-sm border rounded-lg outline-none focus:border-blue-400 transition-colors',
                                                        opt.is_correct
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                                            : 'bg-white border-slate-200',
                                                        (isPublished || q.question_type === 'TRUE_FALSE') && 'opacity-60 cursor-not-allowed'
                                                    )}
                                                />
                                                {!isPublished && q.options.length > 2 && q.question_type !== 'TRUE_FALSE' && (
                                                    <button
                                                        onClick={() => removeOption(qIdx, oIdx)}
                                                        className="p-1 text-slate-300 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {!isPublished && q.question_type !== 'TRUE_FALSE' && (
                                            <button
                                                onClick={() => addOption(qIdx)}
                                                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1 transition-colors"
                                            >
                                                <Plus className="w-3 h-3" /> Tambah Opsi
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Text type hint */}
                                {(q.question_type === 'SHORT_ANSWER' || q.question_type === 'ESSAY') && (
                                    <div className="pl-8">
                                        <p className="text-xs text-slate-400 italic bg-white p-3 rounded-lg border border-dashed border-slate-200">
                                            {q.question_type === 'SHORT_ANSWER'
                                                ? '🖊️ Siswa akan mengetik jawaban singkat (dinilai manual)'
                                                : '📝 Siswa akan menulis esai (dinilai manual)'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {isPublished && (
                    <p className="text-xs text-center text-slate-400 pb-2">
                        Kuis sudah dipublish. Kembalikan ke Draft untuk mengedit soal.
                    </p>
                )}
            </div>

            {/* Question Bank Modal */}
            {editingQuizId && (
                <QuestionSearchModal
                    quizId={editingQuizId}
                    isOpen={showQuestionModal}
                    onClose={() => setShowQuestionModal(false)}
                    onAddSuccess={(question) => {
                        setForm(prev => ({
                            ...prev,
                            questions: [
                                ...prev.questions,
                                {
                                    id: question.id,
                                    text: question.question_text,
                                    order: prev.questions.length + 1,
                                    question_type: question.question_type as QuestionType,
                                    points: 1,
                                    explanation: question.explanation || null,
                                    options: (question.options || []).map((o: any) => ({
                                        text: o.option_text,
                                        is_correct: o.is_correct,
                                    })),
                                },
                            ],
                        }));
                        setShowQuestionModal(false);
                    }}
                />
            )}
        </div>
    );
}
