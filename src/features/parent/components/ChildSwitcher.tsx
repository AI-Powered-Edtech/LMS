// ==========================================================================
// ChildSwitcher — Tab switcher untuk berpindah antar anak
// ==========================================================================

import { cn } from "@/utils/cn";

import type { ChildInfo } from "../types";

interface ChildSwitcherProps {
  children: ChildInfo[];
  selectedId: string | null;
  onSelect: (studentId: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function ChildSwitcher({
  children: childList,
  selectedId,
  onSelect,
}: ChildSwitcherProps) {
  if (childList.length <= 1) return null;

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
      role="tablist"
      aria-label="Pilih anak"
    >
      {childList.map((child) => {
        const isSelected = child.student_id === selectedId;

        return (
          <button
            key={child.student_id}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onSelect(child.student_id)}
            className={cn(
              "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl",
              "text-sm font-medium transition-all duration-200",
              "min-h-[44px] min-w-[44px]",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
              isSelected
                ? "bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-blue-900/30"
                : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700",
            )}
          >
            {/* Avatar / Initials */}
            <span
              className={cn(
                "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold overflow-hidden",
                isSelected
                  ? "bg-blue-500 text-white"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300",
              )}
              aria-hidden="true"
            >
              {child.student_avatar ? (
                <img
                  src={child.student_avatar}
                  alt={child.student_name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                getInitials(child.student_name)
              )}
            </span>

            {/* Nama */}
            <span className="truncate max-w-[100px]">
              {child.student_name.split(" ")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
