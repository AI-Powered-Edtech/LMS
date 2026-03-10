import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft, Search, RefreshCw, HelpCircle,
    CheckCircle2, XCircle, Clock, TrendingUp, ChevronDown, Loader2,
    Download, BarChart3, Eye
} from 'lucide-react';
import { supabase } from '@/src/lib/supabase';
import { cn } from '@/src/utils/cn';
import { AttemptDetailModal } from '@/src/components/AttemptDetailModal';
import { quizAnalyticsService, QuestionDifficulty } from '@/src/services/quizAnalyticsService';

interface QuizAttemptRow {
    id: string;
    student_id: string;
    quiz_id: string;
    status: 'in_progress' | 'submitted' | 'graded' | 'expired';
    score: number | null;
    passed: boolean | null;
    time_spent: number | null;
    started_at: string;
    submitted_at: string | null;
    profiles: { full_name: string } | null;
    quizzes: { title: string; passing_score: number; max_attempts: number } | null;
}

interface QuizOption {
    id: string;
    title: string;
    lesson_id: string;
}

interface ClassOption {
    id: string;
    name: string;
}

export function QuizGradebook() {
    const [classes, setClasses] = useState<ClassOption[]>([]);
    const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
    const [attempts, setAttempts] = useState<QuizAttemptRow[]>([]);
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedQuiz, setSelectedQuiz] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Phase 3A: Attempt Detail Modal
    const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null);
    const [selectedStudentName, setSelectedStudentName] = useState('');
    const [selectedScore, setSelectedScore] = useState<number | null>(null);
    const [selectedPassed, setSelectedPassed] = useState<boolean | null>(null);

    // Phase 3A: Question Difficulty
    const [questionDifficulty, setQuestionDifficulty] = useState<QuestionDifficulty[]>([]);
    const [isDifficultyLoading, setIsDifficultyLoading] = useState(false);

    // Load teacher's classes
    useEffect(() => {
        async function loadClasses() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('classes')
                .select('id, name')
                .eq('teacher_id', user.id)
                .order('name', { ascending: true });

            if (!error && data) setClasses(data);
        }
        loadClasses();
    }, []);

    // Load quizzes when class changes
    useEffect(() => {
        if (!selectedClass) {
            setQuizzes([]);
            setSelectedQuiz('');
            return;
        }
        async function loadQuizzes() {
            const { data, error } = await supabase
                .from('quizzes')
                .select('id, title, lesson_id')
                .eq('class_id', selectedClass)
                .eq('status', 'published')
                .order('title', { ascending: true });

            if (!error && data) setQuizzes(data);
            setSelectedQuiz('');
        }
        loadQuizzes();
    }, [selectedClass]);

    // Load attempts when quiz changes
    const loadAttempts = useCallback(async () => {
        if (!selectedQuiz) { setAttempts([]); return; }
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase
                .from('quiz_attempts')
                .select(`
                    id, student_id, quiz_id, status, score, passed,
                    time_spent, started_at, submitted_at,
                    profiles:student_id ( full_name ),
                    quizzes:quiz_id ( title, passing_score, max_attempts )
                `)
                .eq('quiz_id', selectedQuiz)
                .in('status', ['submitted', 'graded'])
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            setAttempts((data || []) as unknown as QuizAttemptRow[]);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [selectedQuiz]);

    useEffect(() => { loadAttempts(); }, [loadAttempts]);

    // Load question difficulty when quiz changes
    useEffect(() => {
        if (!selectedQuiz) {
            setQuestionDifficulty([]);
            return;
        }
        async function loadDifficulty() {
            setIsDifficultyLoading(true);
            try {
                const data = await quizAnalyticsService.getQuestionDifficulty(selectedQuiz);
                setQuestionDifficulty(data);
            } catch {
                console.error('Failed to load question difficulty');
            } finally {
                setIsDifficultyLoading(false);
            }
        }
        loadDifficulty();
    }, [selectedQuiz, attempts]);

    // Phase 3A: Handlers
    const handleOpenAttemptDetail = (attempt: QuizAttemptRow) => {
        setSelectedAttemptId(attempt.id);
        setSelectedStudentName(attempt.profiles?.full_name || 'Siswa');
        setSelectedScore(attempt.score);
        setSelectedPassed(attempt.passed);
    };

    const handleExportCSV = () => {
        const csv = quizAnalyticsService.exportGradebookCSV(filteredAttempts);
        const quizTitle = selectedQuizInfo?.title || 'gradebook';
        quizAnalyticsService.downloadCSV(csv, `gradebook_${quizTitle.replace(/\s+/g, '_')}.csv`);
    };

    const filteredAttempts = attempts.filter(a => {
        const name = a.profiles?.full_name?.toLowerCase() || '';
        return name.includes(searchQuery.toLowerCase());
    });

    // Stats
    const scoredAttempts = filteredAttempts.filter(a => a.score !== null);
    const avgScore = scoredAttempts.length
        ? Math.round(scoredAttempts.reduce((s, a) => s + (a.score ?? 0), 0) / scoredAttempts.length)
        : 0;
    const passCount = filteredAttempts.filter(a => a.passed).length;
    const failCount = filteredAttempts.filter(a => a.passed === false).length;

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return '-';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const getScoreColor = (score: number | null, passing: number) => {
        if (score === null) return 'text-slate-400';
        if (score >= passing) return 'text-emerald-600 font-bold';
        if (score >= passing * 0.7) return 'text-amber-600 font-bold';
        return 'text-red-600 font-bold';
    };

    const getScoreBg = (score: number | null, passing: number) => {
        if (score === null) return 'bg-slate-50';
        if (score >= passing) return 'bg-emerald-50';
        if (score >= passing * 0.7) return 'bg-amber-50';
        return 'bg-red-50';
    };

    const selectedQuizInfo = quizzes.find(q => q.id === selectedQuiz);
    const passingScore = attempts[0]?.quizzes?.passing_score ?? 70;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                        <Link to="/teacher-dashboard" className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        Quiz Gradebook
                    </h1>
                    <p className="text-slate-500 mt-1 ml-9 text-sm">
                        Rekap nilai dan statistik kuis per kelas
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        disabled={!selectedQuiz || filteredAttempts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <button
                        onClick={loadAttempts}
                        disabled={!selectedQuiz || isLoading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Kelas</label>
                    <div className="relative">
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm pr-10"
                        >
                            <option value="">-- Semua kelas --</option>
                            {classes.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Pilih Kuis</label>
                    <div className="relative">
                        <select
                            value={selectedQuiz}
                            onChange={e => setSelectedQuiz(e.target.value)}
                            disabled={!selectedClass || quizzes.length === 0}
                            className="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm pr-10 disabled:opacity-50"
                        >
                            <option value="">-- Pilih kuis --</option>
                            {quizzes.map(q => (
                                <option key={q.id} value={q.id}>{q.title}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {selectedQuiz && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        {
                            label: 'Rata-rata Skor', value: `${avgScore}`, sub: `dari 100`,
                            icon: <TrendingUp className="w-4 h-4" />, color: 'bg-blue-50 text-blue-600'
                        },
                        {
                            label: 'Total Percobaan', value: `${filteredAttempts.length}`, sub: 'siswa',
                            icon: <HelpCircle className="w-4 h-4" />, color: 'bg-purple-50 text-purple-600'
                        },
                        {
                            label: 'Lulus', value: `${passCount}`, sub: `${filteredAttempts.length > 0 ? Math.round(passCount / filteredAttempts.length * 100) : 0}% pass rate`,
                            icon: <CheckCircle2 className="w-4 h-4" />, color: 'bg-emerald-50 text-emerald-600'
                        },
                        {
                            label: 'Tidak Lulus', value: `${failCount}`, sub: `nilai < ${passingScore}`,
                            icon: <XCircle className="w-4 h-4" />, color: 'bg-red-50 text-red-600'
                        },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-slate-500 font-medium text-xs sm:text-sm">{stat.label}</span>
                                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.color)}>
                                    {stat.icon}
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-slate-800">{stat.value}</div>
                            <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Cari nama siswa..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {selectedQuizInfo && (
                        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-full shrink-0">
                            {selectedQuizInfo.title}
                        </span>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">{error}</div>
                )}

                {!selectedQuiz ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <HelpCircle className="w-12 h-12 mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">Pilih kelas dan kuis</p>
                        <p className="text-sm mt-1">untuk melihat rekap nilai siswa.</p>
                    </div>
                ) : isLoading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Memuat data...</span>
                    </div>
                ) : filteredAttempts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                        <Clock className="w-10 h-10 mb-3 opacity-30" />
                        <p className="font-medium text-slate-500">Belum ada percobaan</p>
                        <p className="text-sm mt-1">Siswa belum mengerjakan kuis ini.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Siswa</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Skor</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Waktu</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Diserahkan</th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredAttempts.map(attempt => (
                                    <tr key={attempt.id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => handleOpenAttemptDetail(attempt)}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${attempt.profiles?.full_name}`}
                                                        alt=""
                                                    />
                                                </div>
                                                <span className="font-semibold text-slate-800 text-sm">
                                                    {attempt.profiles?.full_name || 'Siswa'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn(
                                                'inline-flex items-center justify-center w-14 h-8 rounded-lg text-sm',
                                                getScoreBg(attempt.score, passingScore),
                                                getScoreColor(attempt.score, passingScore)
                                            )}>
                                                {attempt.score ?? '-'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {attempt.passed === true ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                                    <CheckCircle2 className="w-3 h-3" /> Lulus
                                                </span>
                                            ) : attempt.passed === false ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold">
                                                    <XCircle className="w-3 h-3" /> Tidak Lulus
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-600">
                                            <span className="inline-flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {formatDuration(attempt.time_spent)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center text-sm text-slate-500">
                                            {attempt.submitted_at
                                                ? new Date(attempt.submitted_at).toLocaleString('id-ID', {
                                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleOpenAttemptDetail(attempt); }}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Question Difficulty Section */}
            {selectedQuiz && questionDifficulty.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-500" />
                        <h3 className="font-bold text-slate-800">Tingkat Kesulitan Soal</h3>
                        <span className="text-xs text-slate-400 ml-auto">
                            % siswa menjawab benar
                        </span>
                    </div>
                    {isDifficultyLoading ? (
                        <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm">Memuat...</span>
                        </div>
                    ) : (
                        <div className="p-4 space-y-3">
                            {questionDifficulty.map((q, idx) => {
                                const percent = q.difficulty_percent ?? 0;
                                const barColor = percent >= 70
                                    ? 'bg-emerald-500'
                                    : percent >= 40
                                        ? 'bg-amber-500'
                                        : 'bg-red-500';
                                const labelColor = percent >= 70
                                    ? 'text-emerald-600'
                                    : percent >= 40
                                        ? 'text-amber-600'
                                        : 'text-red-600';
                                const label = percent >= 70
                                    ? 'Mudah'
                                    : percent >= 40
                                        ? 'Sedang'
                                        : 'Sulit';

                                return (
                                    <div key={q.question_id} className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-slate-400 w-6 text-right shrink-0">
                                            {idx + 1}.
                                        </span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-slate-700 truncate mb-1">
                                                {q.question_text}
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn('h-full rounded-full transition-all', barColor)}
                                                        style={{ width: `${percent}%` }}
                                                    />
                                                </div>
                                                <span className={cn('text-xs font-bold w-16 text-right shrink-0', labelColor)}>
                                                    {percent}% <span className="font-normal text-slate-400 text-[10px]">{label}</span>
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-0.5">
                                                {q.correct_count} / {q.total_attempts} siswa benar
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Attempt Detail Modal */}
            {selectedAttemptId && (
                <AttemptDetailModal
                    attemptId={selectedAttemptId}
                    studentName={selectedStudentName}
                    score={selectedScore}
                    passed={selectedPassed}
                    onClose={() => setSelectedAttemptId(null)}
                />
            )}
        </div>
    );
}
