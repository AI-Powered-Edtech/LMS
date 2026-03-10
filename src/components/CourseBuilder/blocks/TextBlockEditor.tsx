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
            placeholder="Ketik materi teks di sini... (Mendukung Markdown)"
            className="w-full min-h-[120px] px-3 py-2 text-sm text-slate-700 bg-transparent border-none outline-none resize-y font-mono leading-relaxed placeholder:text-slate-300"
            rows={5}
        />
    );
}
