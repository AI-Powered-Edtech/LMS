import { useState } from 'react';
import { useBuilder } from '@/src/contexts/BuilderContext';
import {
    DragDropContext,
    Droppable,
    Draggable,
    type DropResult,
} from '@hello-pangea/dnd';
import {
    Plus,
    GripVertical,
    ChevronRight,
    ChevronDown,
    Video,
    FileText,
    HelpCircle,
    Trash2,
    FolderOpen,
    MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { motion, AnimatePresence } from 'motion/react';

export function BuilderSidebar() {
    const { state, actions } = useBuilder();
    const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
    const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null);

    const toggleModule = (id: string) => {
        setExpandedModules(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const getLessonIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'video': return <Video className="w-4 h-4 text-blue-500" />;
            case 'article': return <FileText className="w-4 h-4 text-indigo-500" />;
            case 'quiz': return <HelpCircle className="w-4 h-4 text-rose-500" />;
            default: return <FileText className="w-4 h-4 text-slate-400" />;
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const { source, destination, type } = result;

        if (type === 'MODULE') {
            const moduleIds = state.modules.map(m => m.id);
            const [moved] = moduleIds.splice(source.index, 1);
            moduleIds.splice(destination.index, 0, moved);
            actions.reorderModules(moduleIds);
        }

        if (type === 'LESSON') {
            const moduleId = source.droppableId;
            const mod = state.modules.find(m => m.id === moduleId);
            if (!mod) return;
            const lessonIds = mod.lessons.map(l => l.id);
            const [moved] = lessonIds.splice(source.index, 1);
            lessonIds.splice(destination.index, 0, moved);
            actions.reorderLessons(lessonIds);
        }
    };

    const handleAddModule = () => {
        const count = state.modules.length + 1;
        actions.addModule(`Module ${count}`);
    };

    const handleAddLesson = (moduleId: string, type: string) => {
        const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
        actions.addLesson(moduleId, type, `New ${typeLabel}`);
        setAddingLessonTo(null);
        // Auto-expand the module
        setExpandedModules(prev => new Set(prev).add(moduleId));
    };

    return (
        <div className="w-[340px] bg-slate-50/30 border-r border-slate-200/60 flex flex-col h-full shrink-0 relative z-10 backdrop-blur-xl">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200/50 flex items-center justify-between bg-white/50">
                <div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Struktur Kursus</span>
                   <span className="text-sm font-bold text-slate-800">Kurikulum Materi</span>
                </div>
                <button
                    onClick={handleAddModule}
                    className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shadow-indigo-100 hover:scale-105 active:scale-95"
                    title="Tambah Modul"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Module Tree */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {state.loadingCourse ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : state.modules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                        <div className="w-16 h-16 bg-slate-50/80 rounded-2xl flex items-center justify-center mb-4 border border-slate-100/50">
                            <FolderOpen className="w-8 h-8 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-600 mb-2">Belum ada modul</p>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed">Mulai bangun kursus Anda dengan menambahkan modul pertama sebagai kerangka.</p>
                        <button
                            onClick={handleAddModule}
                            className="text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 px-6 py-2.5 rounded-xl transition-all shadow-sm hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Buat Modul
                        </button>
                    </div>
                ) : (
                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="modules" type="MODULE">
                            {(provided) => (
                                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                                    {state.modules.map((mod, modIdx) => (
                                        <Draggable key={mod.id} draggableId={mod.id} index={modIdx}>
                                            {(dragProvided, snapshot) => (
                                                <div
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    className={cn(
                                                        'rounded-lg transition-colors',
                                                        snapshot.isDragging && 'shadow-lg ring-2 ring-blue-200 bg-blue-50'
                                                    )}
                                                >
                                                    {/* Module Header */}
                                                    <div
                                                        className={cn(
                                                            'flex items-center gap-2 px-3 py-3 rounded-xl cursor-pointer group',
                                                            'hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-200/50',
                                                            expandedModules.has(mod.id) && 'bg-white shadow-sm border-slate-200/50 mb-1'
                                                        )}
                                                        onClick={() => toggleModule(mod.id)}
                                                    >
                                                        <div {...dragProvided.dragHandleProps} className="p-0.5 text-slate-300 hover:text-slate-500">
                                                            <GripVertical className="w-3.5 h-3.5" />
                                                        </div>
                                                        {expandedModules.has(mod.id) ? (
                                                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        ) : (
                                                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                        )}
                                                        <span className="text-xs font-bold text-slate-700 truncate flex-1">
                                                            {mod.title}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-medium">
                                                            {mod.lessons.length}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm('Delete this module and all its lessons?')) {
                                                                    actions.deleteModule(mod.id);
                                                                }
                                                            }}
                                                            aria-label={`Hapus Modul ${mod.title}`}
                                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Lessons List */}
                                                    <AnimatePresence initial={false}>
                                                        {expandedModules.has(mod.id) && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="overflow-hidden"
                                                            >
                                                                <Droppable droppableId={mod.id} type="LESSON">
                                                                    {(lessonProvided) => (
                                                                        <div
                                                                            ref={lessonProvided.innerRef}
                                                                            {...lessonProvided.droppableProps}
                                                                            className="pl-6 pb-1 space-y-0.5"
                                                                        >
                                                                            {mod.lessons.map((lesson, lesIdx) => (
                                                                                <Draggable key={lesson.id} draggableId={lesson.id} index={lesIdx}>
                                                                                    {(lesDragProvided, lesSnapshot) => (
                                                                                        <div
                                                                                            ref={lesDragProvided.innerRef}
                                                                                            {...lesDragProvided.draggableProps}
                                                                                            {...lesDragProvided.dragHandleProps}
                                                                                            onClick={() => actions.selectLesson(lesson.id)}
                                                                                            className={cn(
                                                                                                'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group/lesson transition-all text-xs border border-transparent mb-1',
                                                                                                state.activeLesson?.id === lesson.id
                                                                                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100 font-bold'
                                                                                                    : 'text-slate-600 hover:bg-white hover:border-slate-100',
                                                                                                lesSnapshot.isDragging && 'shadow-xl ring-2 ring-indigo-500 bg-white scale-105 z-50'
                                                                                            )}
                                                                                        >
                                                                                            <div className={cn(
                                                                                                "p-1.5 rounded-lg transition-colors",
                                                                                                state.activeLesson?.id === lesson.id ? "bg-white/20" : "bg-slate-100 group-hover/lesson:bg-white"
                                                                                            )}>
                                                                                                {getLessonIcon(lesson.type)}
                                                                                            </div>
                                                                                            <div className="flex-1 min-w-0">
                                                                                                <h4 className={cn(
                                                                                                    "text-sm font-bold truncate",
                                                                                                    state.activeLesson?.id === lesson.id ? "text-white" : "text-slate-700"
                                                                                                )}>
                                                                                                    {lesson.title}
                                                                                                </h4>
                                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                                    <span className={cn(
                                                                                                        "text-[10px] font-medium uppercase tracking-wider",
                                                                                                        state.activeLesson?.id === lesson.id ? "text-white/70" : "text-slate-400"
                                                                                                    )}>
                                                                                                        {lesson.type}
                                                                                                    </span>
                                                                                                    {!lesson.isPublished && (
                                                                                                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400/90 text-amber-900 shadow-sm shadow-amber-200">
                                                                                                            DRAFT
                                                                                                        </span>
                                                                                                    )}
                                                                                                </div>
                                                                                            </div>
                                                                                            <button
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    if (confirm('Delete this lesson?')) {
                                                                                                        actions.deleteLesson(lesson.id);
                                                                                                    }
                                                                                                }}
                                                                                                aria-label={`Hapus Materi ${lesson.title}`}
                                                                                                className={cn(
                                                                                                    "p-1.5 rounded-lg transition-all",
                                                                                                    state.activeLesson?.id === lesson.id 
                                                                                                        ? "opacity-0 group-hover/lesson:opacity-100 hover:bg-white/20 text-white" 
                                                                                                        : "opacity-0 group-hover/lesson:opacity-100 hover:bg-rose-50 text-slate-400 hover:text-rose-500"
                                                                                                )}
                                                                                            >
                                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </div>
                                                                                    )}
                                                                                </Draggable>
                                                                            ))}
                                                                            {lessonProvided.placeholder}

                                                                            {/* Add Lesson Menu */}
                                                                            {addingLessonTo === mod.id ? (
                                                                                <div className="flex gap-2 py-2 px-2 bg-white/40 rounded-xl mt-2 border border-slate-100">
                                                                                    {[
                                                                                        { type: 'article', color: 'indigo' },
                                                                                        { type: 'video', color: 'blue' },
                                                                                        { type: 'quiz', color: 'rose' }
                                                                                    ].map(t => (
                                                                                        <button
                                                                                            key={t.type}
                                                                                            onClick={() => handleAddLesson(mod.id, t.type)}
                                                                                            className={cn(
                                                                                                'flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all border border-dashed hover:scale-105 active:scale-95',
                                                                                                t.type === 'article' && 'text-indigo-600 border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50',
                                                                                                t.type === 'video' && 'text-blue-600 border-blue-200 bg-blue-50/50 hover:bg-blue-50',
                                                                                                t.type === 'quiz' && 'text-rose-600 border-rose-200 bg-rose-50/50 hover:bg-rose-50',
                                                                                            )}
                                                                                        >
                                                                                            {t.type.toUpperCase()}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
                                                                            ) : (
                                                                                <button
                                                                                    onClick={() => setAddingLessonTo(mod.id)}
                                                                                    className="w-full mt-2 py-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-sm rounded-xl transition-all flex items-center justify-center gap-1.5 border border-dashed border-slate-200 hover:border-indigo-200 group/add"
                                                                                >
                                                                                    <Plus className="w-3.5 h-3.5 group-hover/add:rotate-90 transition-transform duration-300" /> 
                                                                                    TAMBAH MATERI
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </Droppable>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                )}
            </div>
        </div>
    );
}
