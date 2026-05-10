import { useEffect, useState } from "react";

import { MarkdownBlock } from "@/components/LessonViewer/blocks/MarkdownBlock";
import { useBuilder } from "@/contexts/BuilderContext";
import { AuthoringAssistToolbar } from "@/features/ai-authoring/components/AuthoringAssistToolbar";
import { cn } from "@/utils/cn";

interface TextBlockEditorProps {
  blockId: string;
}

export function TextBlockEditor({ blockId }: TextBlockEditorProps) {
  const { state, actions } = useBuilder();
  const block = state.activeLesson?.blocks.find((b) => b.id === blockId);

  const [localContent, setLocalContent] = useState(block?.content || "");
  const [previewMode, setPreviewMode] = useState(false);

  // Sync from context if it completely changes (e.g. changing block selection)
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    setLocalContent(block?.content || "");
  }, [block?.id]); // Only reset when the block ID changes
  /* eslint-enable react-hooks/exhaustive-deps */

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
    <div className="flex flex-col h-full">
      {/* Tab row */}
      <div
        className="flex border-b border-slate-200 dark:border-slate-700 mb-3"
        role="tablist"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!previewMode}
          onClick={() => setPreviewMode(false)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            !previewMode
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
          )}
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={previewMode}
          onClick={() => setPreviewMode(true)}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            previewMode
              ? "text-blue-600 border-b-2 border-blue-600"
              : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
          )}
        >
          Pratinjau
        </button>
      </div>

      {/* Content area */}
      {previewMode ? (
        <div className="flex-1 overflow-y-auto min-h-[160px]">
          <MarkdownBlock content={localContent} />
        </div>
      ) : (
        <>
          <AuthoringAssistToolbar
            current={localContent}
            onInsert={(next) => {
              setLocalContent(next);
              actions.updateBlock(blockId, { content: next });
            }}
          />
          <textarea
            aria-label="Konten teks markdown"
            value={localContent}
            onChange={(e) => setLocalContent(e.target.value)}
            onBlur={() => {
              actions.updateBlock(blockId, { content: localContent });
              void actions.saveBlock(blockId);
            }}
            placeholder="Ketik materi di sini... (Mendukung Markdown)"
            className="w-full min-h-[160px] p-0 text-base text-slate-700 bg-transparent border-none outline-none resize-y font-sans leading-relaxed placeholder:text-slate-400 focus:ring-0"
            rows={6}
          />
        </>
      )}
    </div>
  );
}
