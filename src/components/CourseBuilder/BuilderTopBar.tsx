import { useBuilder } from '@/src/contexts/BuilderContext';
import { Save, CheckCircle, AlertCircle, Loader2, Eye, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AssignCourseModal } from '@/src/components/Classroom/AssignCourseModal';
export function BuilderTopBar() {
    const { state, actions } = useBuilder();
    const navigate = useNavigate();
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

    const statusConfig = {
        idle: { icon: null, text: '', color: '' },
        saving: { icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />, text: 'Saving...', color: 'text-amber-500' },
        saved: { icon: <CheckCircle className="w-3.5 h-3.5" />, text: 'Saved', color: 'text-emerald-500' },
        error: { icon: <AlertCircle className="w-3.5 h-3.5" />, text: 'Save failed', color: 'text-red-500' },
    };

    const status = statusConfig[state.savingStatus];

    return (
        <div className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 relative z-20 shadow-sm">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-4 min-w-0">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    title="Kembali"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="min-w-0 flex flex-col justify-center">
                    <h1 className="text-base font-bold text-slate-900 truncate">
                        {state.courseTitle || 'Memuat Kursus...'}
                    </h1>
                    {state.courseDescription && (
                        <p className="text-xs text-slate-500 truncate">{state.courseDescription}</p>
                    )}
                </div>
            </div>

            {/* Right: Status + Actions */}
            <div className="flex items-center gap-3">
                {/* Save Status */}
                {state.savingStatus !== 'idle' && (
                    <div className={cn('flex items-center gap-1.5 text-xs font-medium', status.color)}>
                        {status.icon}
                        <span>{status.text}</span>
                    </div>
                )}

                {/* Status Indicator */}
                <div className={cn(
                    'px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border',
                    state.courseStatus === 'published'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                )}>
                    {state.courseStatus === 'published' ? 'Published' : 'Draft'}
                </div>

                {/* Preview Button */}
                <button
                    onClick={() => {
                        window.open(`/courses/${state.courseId}?preview=true`, '_blank');
                    }}
                    disabled={!state.courseId}
                    className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-600 rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    <Eye className="w-4 h-4" />
                    Preview
                </button>

                {/* Publish/Draft Toggle Button */}
                {state.courseStatus === 'published' ? (
                    <button
                        onClick={() => actions.draftCourse()}
                        className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:text-red-600 rounded-xl transition-all flex items-center gap-2 shadow-sm">
                        Batalkan Publish
                    </button>
                ) : (
                    <button
                        onClick={async () => {
                            await actions.publishCourse();
                            // Logic for success is usually handled by savingStatus going to 'saved'
                            // But here we want to trigger the modal explicitly
                            setIsAssignModalOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 rounded-xl transition-all flex items-center gap-2">
                        <Save className="w-4 h-4" />
                        Publish
                    </button>
                )}
            </div>

            {/* Post-Publish Assignment Modal */}
            <AssignCourseModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                courseId={state.courseId || ''}
                courseTitle={state.courseTitle || ''}
            />
        </div>
    );
}
