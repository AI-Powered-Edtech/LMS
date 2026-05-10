import { AlertTriangle, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { Badge, Card, EmptyState, SkeletonCard } from "@/components/ui";
import { cn } from "@/utils/cn";
import { translateLessonType } from "@/utils/statusTranslations";

interface Assignment {
  id: string;
  title: string;
  type: string;
  status: string;
  dueDate: string;
}

interface UpcomingAssignmentsProps {
  assignments: Assignment[];
  loading: boolean;
}

export function UpcomingAssignments({
  assignments,
  loading,
}: UpcomingAssignmentsProps) {
  const navigate = useNavigate();

  const pendingAssignments = assignments
    .filter((a) => a.status === "assigned" || a.status === "late")
    .slice(0, 3);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          Tugas Mendekati Deadline
        </h2>
        <Link
          to="/assignments"
          className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Lihat Semua
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard lines={1} />
          <SkeletonCard lines={1} />
        </div>
      ) : pendingAssignments.length > 0 ? (
        <div className="space-y-3">
          {pendingAssignments.map((task) => (
            <div
              key={task.id}
              role="button"
              tabIndex={0}
              className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700/60 transition-colors group cursor-pointer"
              onClick={() => navigate("/assignments")}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void navigate("/assignments");
                }
              }}
              aria-label={`Tugas: ${task.title}`}
            >
              <div
                className={cn(
                  "w-3 h-3 rounded-full shrink-0",
                  task.status === "late"
                    ? "bg-red-500 animate-pulse"
                    : "bg-yellow-400",
                )}
              />
              <div className="flex-1">
                <h3 className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="neutral" size="sm">
                    {translateLessonType(task.type)}
                  </Badge>
                  <span
                    className={cn(
                      "text-xs font-bold",
                      task.status === "late"
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-500 dark:text-slate-400",
                    )}
                  >
                    {new Date(task.dueDate).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<AlertTriangle className="w-10 h-10" />}
          title="Tidak ada tugas mendesak"
          description="Semua tugasmu sudah terkendali."
        />
      )}
    </Card>
  );
}
