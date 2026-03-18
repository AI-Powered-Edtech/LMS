import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { CheckCircle, Circle, PlayCircle, FileText, AlertTriangle, Lock, ChevronRight, ArrowLeft } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import type { Lesson, LessonProgress } from '@/src/features/lessons';
import { SkeletonCard } from '@/src/components/ui';

interface LessonSidebarProps {
    moduleTitle?: string;
    lessons: Lesson[];
    progress: Record<string, LessonProgress>;
    activeLessonId: string | null;
    onSelectLesson: (lessonId: string) => void;
    onBack?: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
    video: <PlayCircle className="w-4 h-4" />,
    article: <FileText className="w-4 h-4" />,
    quiz: <AlertTriangle className="w-4 h-4" />,
};

const typeLabels: Record<string, string> = {
    video: 'Video',
    article: 'Artikel',
    quiz: 'Kuis',
};

export function LessonSidebar({ moduleTitle, lessons, progress, activeLessonId, onSelectLesson, onBack }: LessonSidebarProps) {
    const completedCount = lessons.filter(l => progress[l.id]?.status === 'completed').length;

    const parentRef = useRef<HTMLDivElement>(null);

    const rowVirtualizer = useVirtualizer({
        count: lessons.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 100, // estimated height of each lesson card in px
        overscan: 5,
    });

    return (
        <aside className="w-full lg:w-80 bg-white border border-slate-200/70 rounded-2xl flex flex-col shrink-0 h-[50vh] lg:h-full overflow-hidden shadow-lg shadow-slate-200/50 z-20">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-white to-blue-50/30 border-b border-slate-100 z-10 shrink-0">
                {onBack && (
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali
                    </button>
                )}
                <h2 className="font-bold text-slate-900 text-lg mb-3 leading-snug">{moduleTitle || "Daftar Pelajaran"}</h2>
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-sm font-bold text-slate-500">{completedCount}/{lessons.length}</span>
                </div>
            </div>

            {/* Lesson List - Virtualized */}
            <div ref={parentRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
                {lessons.length === 0 ? (
                    <div className="p-4 space-y-3">
                        <SkeletonCard lines={1} />
                        <SkeletonCard lines={1} />
                        <SkeletonCard lines={1} />
                    </div>
                ) : (
                    <div
                        className="w-full relative"
                        style={{ height: `${rowVirtualizer.getTotalSize() + 32}px` }} // +32px for top/bottom padding 16px
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                            const lesson = lessons[virtualRow.index];
                            const prog = progress[lesson.id];
                            const isCompleted = prog?.status === 'completed';
                            const isActive = lesson.id === activeLessonId;

                            return (
                                <div
                                    key={virtualRow.key}
                                    data-index={virtualRow.index}
                                    ref={rowVirtualizer.measureElement}
                                    className="absolute top-0 left-0 w-full px-4 pb-3"
                                    style={{
                                        transform: `translateY(${virtualRow.start + 16}px)`, // +16px top padding offset
                                    }}
                                >
                                    <button
                                        onClick={() => onSelectLesson(lesson.id)}
                                        aria-current={isActive ? "page" : undefined}
                                        className={cn(
                                            "w-full text-left p-4 rounded-xl transition-all flex items-start gap-4 group border outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                                            isActive
                                                ? "bg-blue-50 border-blue-200/80 shadow-md shadow-blue-100/50 ring-1 ring-blue-100"
                                                : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                                        )}
                                    >
                                        {/* Status Icon */}
                                        <div className={cn(
                                            "mt-0.5 shrink-0 transition-colors",
                                            isCompleted ? "text-green-500" : "text-slate-300 group-hover:text-green-400",
                                            isActive && !isCompleted ? "text-blue-500" : ""
                                        )}>
                                            {isCompleted ? <CheckCircle className="w-5 h-5" /> : (isActive ? <PlayCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />)}
                                        </div>
                                        <span className="sr-only">
                                            {isCompleted ? "Pelajaran selesai" : "Pelajaran belum selesai"}
                                        </span>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className={cn(
                                                "text-sm font-bold leading-snug mb-2",
                                                isActive ? "text-blue-900" : "text-slate-700 group-hover:text-slate-900"
                                            )}>
                                                {lesson.title}
                                            </p>
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                                                    {lesson.type === 'video' ? (
                                                        <>
                                                            <PlayCircle className="w-3.5 h-3.5" />
                                                            {lesson.duration_minutes ? `0:${lesson.duration_minutes.toString().padStart(2, '0')}` : 'Video'}
                                                        </>
                                                    ) : lesson.type === 'article' ? (
                                                        <>
                                                            <FileText className="w-3.5 h-3.5" />
                                                            {lesson.duration_minutes ? `${lesson.duration_minutes} min read` : 'Artikel'}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                            {typeLabels[lesson.type] || lesson.type}
                                                        </>
                                                    )}
                                                </span>

                                                {lesson.passing_score ? (
                                                    <span className={cn(
                                                        "text-[10px] font-bold px-2 py-0.5 rounded-md",
                                                        isActive ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                                                    )}>
                                                        Min. Skor: {lesson.passing_score}
                                                    </span>
                                                ) : lesson.type === 'video' && isActive ? (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-600">
                                                        Min. Skor: 80
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </aside>
    );
}
