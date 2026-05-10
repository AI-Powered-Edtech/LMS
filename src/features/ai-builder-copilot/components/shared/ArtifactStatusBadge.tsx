import { cn } from "@/utils/cn";

import { ARTIFACT_STATUS_LABELS, type ArtifactStatus } from "../../types";

const STATUS_STYLES: Record<ArtifactStatus, string> = {
  generated: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  applied:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  dismissed:
    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

interface ArtifactStatusBadgeProps {
  status: ArtifactStatus;
  className?: string;
}

export function ArtifactStatusBadge({
  status,
  className,
}: ArtifactStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full",
        STATUS_STYLES[status],
        className,
      )}
    >
      {ARTIFACT_STATUS_LABELS[status]}
    </span>
  );
}
