import { WifiOff } from "lucide-react";

import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { cn } from "@/utils/cn";

interface OfflineFormNoticeProps {
  /** Extra Tailwind classes applied to the root element */
  className?: string;
  /** Override the default Bahasa Indonesia message */
  message?: string;
}

/**
 * Inline notice to embed inside any form or card.
 *
 * Shows an amber/yellow warning when the user is offline, informing them
 * that changes will be saved once connectivity returns.
 *
 * Usage:
 * ```tsx
 * <form>
 *   <OfflineFormNotice />
 *   ...fields...
 * </form>
 * ```
 */
export function OfflineFormNotice({
  className,
  message,
}: OfflineFormNoticeProps) {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
        "bg-amber-50 text-amber-800 border border-amber-200",
        "dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800",
        className,
      )}
    >
      <WifiOff className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>
        {message ?? "Anda sedang offline. Perubahan akan disimpan saat online."}
      </span>
    </div>
  );
}
