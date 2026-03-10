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
    Trash2,
    FileText,
    Video,
    HelpCircle,
    Image,
    File,
    Loader2,
    X,
    Type,
} from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { TextBlockEditor } from './blocks/TextBlockEditor';
import { VideoBlockEditor } from './blocks/VideoBlockEditor';
import { QuizBlockEditor } from './blocks/QuizBlockEditor';
import { AssignmentBlockEditor } from './blocks/AssignmentBlockEditor';
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

export function LessonBlockEditor() {
    const { state, actions } = useBuilder();
    const [showAddMenu, setShowAddMenu] = useState(false);

    if (!state.activeLesson) {
        return (
            <div className="flex-1 flex items-center justify-center bg-transparent p-6">
                <div className="text-center max-w-sm p-10 bg-white rounded-3xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-slate-100">
                    <div className="w-20 h-20 bg-blue-50/80 text-blue-500 rounded-[28px] flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Pilih Pelajaran</h3>
                    <p className="text-sm text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                        Pilih pelajaran dari sidebar di sebelah kiri untuk mulai mengatur materi, video, kuis, atau tugas.
                    </p>
                </div>
            </div>
        );
    }

    if (state.loadingBlocks) {
        return (
            <div className="flex-1 flex items-center justify-center bg-transparent">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <p className="text-sm font-medium text-slate-500 animate-pulse">Memuat data pelajaran...</p>
                </div>
            </div>
        );
    }

    const activeLesson = state.modules
        .flatMap(m => m.lessons)
        .find(l => l.id === state.activeLesson?.id);

    const getBlockIcon = (type: string) => {
        switch (type?.toUpperCase()) {
            case 'TEXT': return <Type className="w-3.5 h-3.5 text-slate-500" />;
            case 'VIDEO': return <Video className="w-3.5 h-3.5 text-blue-500" />;
            case 'IMAGE': return <Image className="w-3.5 h-3.5 text-emerald-500" />;
            case 'FILE': return <File className="w-3.5 h-3.5 text-orange-500" />;
            case 'QUIZ': return <HelpCircle className="w-3.5 h-3.5 text-purple-500" />;
            case 'ASSIGNMENT': return <FileText className="w-3.5 h-3.5 text-rose-500" />;
            default: return <FileText className="w-3.5 h-3.5 text-slate-400" />;
        }
    };

    const handleDragEnd = (result: DropResult) => {
        if (!result.destination) return;
        const blockIds = state.activeLesson!.blocks.map(b => b.id);
        const [moved] = blockIds.splice(result.source.index, 1);
        blockIds.splice(result.destination.index, 0, moved);
        actions.reorderBlocks(blockIds);
    };

    const handleAddBlock = (type: string) => {
        actions.addBlock(type);
        setShowAddMenu(false);
    };

    const blockTypes = [
        { type: 'text', label: 'Text', icon: <Type className="w-4 h-4" />, color: 'text-slate-600 hover:bg-slate-50 border-slate-200' },
        { type: 'video', label: 'Video', icon: <Video className="w-4 h-4" />, color: 'text-blue-600 hover:bg-blue-50 border-blue-200' },
        { type: 'image', label: 'Image', icon: <Image className="w-4 h-4" />, color: 'text-emerald-600 hover:bg-emerald-50 border-emerald-200' },
        { type: 'file', label: 'File', icon: <File className="w-4 h-4" />, color: 'text-orange-600 hover:bg-orange-50 border-orange-200' },
        { type: 'quiz', label: 'Quiz', icon: <HelpCircle className="w-4 h-4" />, color: 'text-purple-600 hover:bg-purple-50 border-purple-200' },
        { type: 'assignment', label: 'Tugas', icon: <FileText className="w-4 h-4" />, color: 'text-rose-600 hover:bg-rose-50 border-rose-200' },
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50">
            <div className="max-w-3xl mx-auto py-8 px-6">
                {/* Lesson Header */}
                <div className="mb-6">
                    <input
                        type="text"
                        value={activeLesson?.title || ''}
                        onChange={(e) => {
                            if (activeLesson) {
                                actions.updateLesson(activeLesson.id, { title: e.target.value });
                            }
                        }}
                        className="w-full text-2xl font-bold text-slate-900 bg-transparent border-none outline-none placeholder:text-slate-300 focus:ring-0"
                        placeholder="Lesson Title..."
                    />
                    <div className="flex items-center gap-2 mt-2">
                        <span className={cn(
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded',
                            activeLesson?.isPublished
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                        )}>
                            {activeLesson?.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {state.activeLesson.blocks.length} block{state.activeLesson.blocks.length !== 1 && 's'}
                        </span>
                    </div>
                </div>

                {/* Block List with DND */}
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="blocks" type="BLOCK">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                                <AnimatePresence>
                                    {state.activeLesson.blocks.map((block, idx) => (
                                        <Draggable key={block.id} draggableId={block.id} index={idx}>
                                            {(dragProvided, snapshot) => (
                                                <motion.div
                                                    ref={dragProvided.innerRef}
                                                    {...dragProvided.draggableProps}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className={cn(
                                                        'bg-white rounded-xl border shadow-sm group transition-shadow',
                                                        snapshot.isDragging
                                                            ? 'shadow-lg ring-2 ring-blue-200 border-blue-300'
                                                            : 'border-slate-200 hover:shadow-md'
                                                    )}
                                                >
                                                    {/* Block Header */}
                                                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                                                        <div {...dragProvided.dragHandleProps} className="p-0.5 text-slate-300 hover:text-slate-500 cursor-grab">
                                                            <GripVertical className="w-3.5 h-3.5" />
                                                        </div>
                                                        {getBlockIcon(block.type)}
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex-1">
                                                            {block.type}
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                if (confirm('Delete this block?')) {
                                                                    actions.deleteBlock(block.id);
                                                                }
                                                            }}
                                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>

                                                    {/* Block Content */}
                                                    <div className="p-3">
                                                        {renderBlockContent(block)}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </Draggable>
                                    ))}
                                </AnimatePresence>
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>

                {/* Add Block Button */}
                <div className="relative mt-4">
                    <button
                        onClick={() => setShowAddMenu(!showAddMenu)}
                        className={cn(
                            'w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                            'border-2 border-dashed',
                            showAddMenu
                                ? 'border-blue-300 bg-blue-50 text-blue-600'
                                : 'border-slate-300 text-slate-400 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50'
                        )}
                    >
                        {showAddMenu ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showAddMenu ? 'Cancel' : 'Add Block'}
                    </button>

                    {/* Block Type Menu */}
                    <AnimatePresence>
                        {showAddMenu && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                className="mt-2 grid grid-cols-5 gap-2"
                            >
                                {blockTypes.map(bt => (
                                    <button
                                        key={bt.type}
                                        onClick={() => handleAddBlock(bt.type)}
                                        className={cn(
                                            'py-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1.5 transition-colors border',
                                            bt.color
                                        )}
                                    >
                                        {bt.icon}
                                        {bt.label}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function renderBlockContent(block: { id: string; type: string; content: string | null; url: string | null }) {
    switch (block.type?.toUpperCase()) {
        case 'TEXT':
            return <TextBlockEditor blockId={block.id} />;
        case 'VIDEO':
            return <VideoBlockEditor blockId={block.id} />;
        case 'IMAGE':
            return (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Image block — coming in Phase 5
                </div>
            );
        case 'FILE':
            return (
                <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    File block — coming in Phase 5
                </div>
            );
        case 'QUIZ':
            return <QuizBlockEditor blockId={block.id} />;
        case 'ASSIGNMENT':
            return <AssignmentBlockEditor blockId={block.id} />;
        default:
            return <p className="text-xs text-slate-400">Unknown block type: {block.type}</p>;
    }
}
