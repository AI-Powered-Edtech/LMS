import { X } from "lucide-react";
import React from "react";

import { cn } from "@/utils/cn";

export interface BulkAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}

export interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onClearSelection,
}: BulkActionBarProps): React.JSX.Element | null {
  if (selectedCount === 0) return null;

  return (
    <div
      role="toolbar"
      aria-label="Aksi massal"
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 px-4 py-2.5",
        "bg-blue-600 dark:bg-blue-700",
        "text-white text-sm font-medium",
        "shadow-md",
        "animate-in slide-in-from-top duration-200",
      )}
    >
      {/* Selection count */}
      <span className="shrink-0 tabular-nums">
        {selectedCount} item dipilih
      </span>

      <span className="text-blue-300 dark:text-blue-400 select-none">|</span>

      {/* Action buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={cn(
              "px-3 py-1 rounded-lg text-sm font-semibold transition-colors outline-none",
              "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-blue-600",
              action.variant === "danger"
                ? "bg-red-500 hover:bg-red-400 dark:bg-red-600 dark:hover:bg-red-500 text-white"
                : "bg-white/20 hover:bg-white/30 text-white",
            )}
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear selection */}
      <button
        type="button"
        onClick={onClearSelection}
        aria-label="Batalkan pilihan"
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-semibold",
          "bg-white/20 hover:bg-white/30 transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-1 focus-visible:ring-offset-blue-600",
        )}
      >
        <X className="w-3.5 h-3.5" />
        Batalkan pilihan
      </button>
    </div>
  );
}
