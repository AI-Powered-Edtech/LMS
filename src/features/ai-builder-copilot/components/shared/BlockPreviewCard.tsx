import { Type } from "lucide-react";

import { cn } from "@/utils/cn";

import type { LessonDraftBlock } from "../../types";

interface BlockPreviewCardProps {
  block: LessonDraftBlock;
  index: number;
  selected: boolean;
  onToggle: () => void;
}

export function BlockPreviewCard({
  block,
  index,
  selected,
  onToggle,
}: BlockPreviewCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        selected
          ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30"
          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800",
      )}
    >
      <div className="flex items-start gap-3 px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
          aria-label={`Pilih blok ${block.title || `#${index + 1}`}`}
        />
        <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg shrink-0">
          <Type className="w-3.5 h-3.5 text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          {block.title && (
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mb-1">
              {block.title}
            </h4>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed">
            {block.content.slice(0, 200)}
            {block.content.length > 200 ? "..." : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
