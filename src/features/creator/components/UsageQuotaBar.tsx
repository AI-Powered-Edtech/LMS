/**
 * Displays AI generation usage quota for the current hour.
 * Queries ai_generation_logs for the current user.
 */
import { useQuery } from "@tanstack/react-query";
import { Zap } from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";
import { cn } from "@/utils/cn";

const MAX_PER_HOUR = 20;

function useHourlyUsage() {
  const { user, tenantId } = useAuth();

  return useQuery({
    queryKey: ["ai-creator", "quota", tenantId, user?.id],
    queryFn: async () => {
      const since = new Date(Date.now() - 3_600_000).toISOString();
      const { count, error } = await db
        .from("ai_generation_logs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("tenant_id", tenantId!)
        .eq("status", "success")
        .gte("created_at", since);

      if (error) return 0;
      return count ?? 0;
    },
    enabled: !!user && !!tenantId,
    staleTime: 60_000, // refresh every 60s
    refetchInterval: 60_000,
  });
}

export function UsageQuotaBar() {
  const { data: used = 0, isLoading } = useHourlyUsage();

  if (isLoading) return null;

  const percent = Math.min((used / MAX_PER_HOUR) * 100, 100);
  const remaining = Math.max(MAX_PER_HOUR - used, 0);
  const isWarning = used >= 15;
  const isDanger = used >= 18;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
      <Zap
        className={cn(
          "w-4 h-4 shrink-0",
          isDanger
            ? "text-red-500 dark:text-red-400"
            : isWarning
              ? "text-amber-500 dark:text-amber-400"
              : "text-blue-500 dark:text-blue-400",
        )}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Kuota generasi AI
          </span>
          <span
            className={cn(
              "text-xs font-bold",
              isDanger
                ? "text-red-600 dark:text-red-400"
                : isWarning
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-700 dark:text-slate-200",
            )}
          >
            {used}/{MAX_PER_HOUR} per jam
          </span>
        </div>
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isDanger
                ? "bg-red-500"
                : isWarning
                  ? "bg-amber-500"
                  : "bg-blue-500",
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      {remaining === 0 && (
        <span className="text-xs text-red-600 dark:text-red-400 font-medium shrink-0">
          Habis
        </span>
      )}
      {remaining > 0 && remaining <= 5 && (
        <span className="text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
          Sisa {remaining}
        </span>
      )}
    </div>
  );
}
