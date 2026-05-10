import { CheckCircle2 } from "lucide-react";

import { cn } from "@/utils/cn";

import type { RubricLevel } from "../types";

interface RubricLevelCellProps {
  level: RubricLevel;
  isSelected: boolean;
  onClick: () => void;
}

export function RubricLevelCell({
  level,
  isSelected,
  onClick,
}: RubricLevelCellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={level.description || level.label}
      className={cn(
        "group relative text-left p-3 rounded-xl border text-sm transition-all w-full",
        isSelected
          ? "bg-green-50 dark:bg-green-900/30 border-green-500 dark:border-green-600 shadow-sm shadow-green-100 dark:shadow-none ring-2 ring-green-400 dark:ring-green-600"
          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-slate-50 dark:hover:bg-slate-800/80",
      )}
    >
      <div className="flex justify-between items-start mb-1">
        <span
          className={cn(
            "font-bold text-xs",
            isSelected
              ? "text-green-700 dark:text-green-400"
              : "text-slate-700 dark:text-slate-300",
          )}
        >
          {level.label}
        </span>
        <span
          className={cn(
            "text-xs font-bold px-1.5 py-0.5 rounded-md ml-1 shrink-0",
            isSelected
              ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400"
              : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
          )}
        >
          {level.points}
        </span>
      </div>
      {level.description && (
        <p
          className={cn(
            "text-xs leading-relaxed line-clamp-2",
            isSelected
              ? "text-green-600/80 dark:text-green-400/80"
              : "text-slate-500 dark:text-slate-400",
          )}
        >
          {level.description}
        </p>
      )}
      {isSelected && (
        <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-green-500 dark:text-green-400" />
      )}
    </button>
  );
}
