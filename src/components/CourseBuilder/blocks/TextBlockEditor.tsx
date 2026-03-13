import { useState, useEffect } from 'react';
import { useBuilder } from '@/src/contexts/BuilderContext';

interface TextBlockEditorProps {
    blockId: string;
}

export function TextBlockEditor({ blockId }: TextBlockEditorProps) {
    const { state, actions } = useBuilder();
    const block = state.activeLesson?.blocks.find(b => b.id === blockId);

    const [localContent, setLocalContent] = useState(block?.content || '');

    // Sync from context if it completely changes (e.g. changing block selection)
    useEffect(() => {
        setLocalContent(block?.content || '');
    }, [block?.id]); // Only reset when the block ID changes

    // Local autosave debounce to prevent Context re-render spam
    useEffect(() => {
        if (!block) return;
        const timer = setTimeout(() => {
            if (localContent !== block.content) {
                actions.updateBlock(blockId, { content: localContent });
            }
        }, 1000);
        return () => clearTimeout(timer);
    }, [localContent, blockId, actions, block]);

    if (!block) return null;

    return (
        <textarea
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={() => {
                actions.updateBlock(blockId, { content: localContent });
                actions.saveBlock(blockId);
            }}
            placeholder="Ketik materi materi di sini... (Mendukung Markdown)"
            className="w-full min-h-[160px] p-0 text-base text-slate-700 bg-transparent border-none outline-none resize-y font-sans leading-relaxed placeholder:text-slate-200 focus:ring-0"
            rows={6}
        />
    );
}
