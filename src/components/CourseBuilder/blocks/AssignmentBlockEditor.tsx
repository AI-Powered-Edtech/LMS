import { useState, useEffect } from 'react';
import { FileText, Loader2, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useBuilder } from '@/src/contexts/BuilderContext';
import { courseBuilderService, type AssignmentBlockData } from '@/src/services/courseBuilderService';
import { cn } from '@/src/utils/cn';

export function AssignmentBlockEditor({ blockId }: { blockId: string }) {
    const { state } = useBuilder();
    const activeLesson = state.modules
        .flatMap(m => m.lessons)
        .find(l => l.id === state.activeLesson?.id);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedAssignmentId, setSavedAssignmentId] = useState<string | undefined>(undefined);

    const [assignmentData, setAssignmentData] = useState<AssignmentBlockData>({
        title: 'Tugas Baru',
        instructions: '',
        max_points: 100,
        max_attempts: 1,
        is_published: false,
        due_date: null
    });

    useEffect(() => {
        if (!activeLesson) return;
        async function load() {
            try {
                const data = await courseBuilderService.getAssignmentByLesson(activeLesson!.id);
                if (data) {
                    setSavedAssignmentId(data.id);
                    setAssignmentData({
                        id: data.id,
                        title: data.title || '',
                        instructions: data.instructions || '',
                        max_points: data.max_points || 100,
                        max_attempts: data.max_attempts || 1,
                        is_published: data.is_published || false,
                        due_date: data.due_date ? new Date(data.due_date).toISOString().split('T')[0] : null
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

    const handleSave = async () => {
        if (!activeLesson) return;
        setIsSaving(true);
        setError(null);
        try {
            const payload: AssignmentBlockData = {
                ...assignmentData,
                id: savedAssignmentId,
            };
            const result = await courseBuilderService.saveAssignmentData(
                activeLesson.id,
                state.courseId ?? '',
                activeLesson.tenantId,
                payload
            );
            setSavedAssignmentId(result.id);
            setAssignmentData(prev => ({ ...prev, id: result.id }));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Memuat data tugas...</span>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900">Assignment Editor</h3>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 bg-rose-50 text-rose-700">
                            Phase 4 Implementation
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 mr-2 border-r border-slate-200 pr-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Status:</label>
                        <button
                            onClick={() => setAssignmentData({ ...assignmentData, is_published: !assignmentData.is_published })}
                            className={cn(
                                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                                assignmentData.is_published ? "bg-emerald-500" : "bg-slate-300"
                            )}
                        >
                            <span
                                className={cn(
                                    "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                    assignmentData.is_published ? "translate-x-6" : "translate-x-1"
                                )}
                            />
                        </button>
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full",
                            assignmentData.is_published ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
                        )}>
                            {assignmentData.is_published ? 'Published' : 'Draft'}
                        </span>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="px-3 py-1.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        Simpan Tugas
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            {/* Assignment Settings */}
            <div className="grid grid-cols-1 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Judul Tugas</label>
                    <input
                        type="text"
                        value={assignmentData.title}
                        onChange={e => setAssignmentData({ ...assignmentData, title: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                        placeholder="Masukkan judul tugas..."
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Instruksi Tugas</label>
                    <textarea
                        value={assignmentData.instructions || ''}
                        onChange={e => setAssignmentData({ ...assignmentData, instructions: e.target.value })}
                        rows={6}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none resize-none"
                        placeholder="Masukkan instruksi lengkap untuk dikerjakan siswa..."
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maks. Poin</label>
                        <input
                            type="number"
                            min="1"
                            value={assignmentData.max_points}
                            onChange={e => setAssignmentData({ ...assignmentData, max_points: parseInt(e.target.value) || 0 })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Maks. Percobaan</label>
                        <input
                            type="number"
                            min="1"
                            value={assignmentData.max_attempts}
                            onChange={e => setAssignmentData({ ...assignmentData, max_attempts: parseInt(e.target.value) || 1 })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none font-bold"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tenggat Waktu (Opsional)</label>
                    <div className="relative">
                        <input
                            type="date"
                            value={assignmentData.due_date || ''}
                            onChange={e => setAssignmentData({ ...assignmentData, due_date: e.target.value || null })}
                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none"
                        />
                        <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
}
