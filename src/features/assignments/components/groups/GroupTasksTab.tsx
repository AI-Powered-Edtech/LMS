import { CheckCircle2, CheckSquare, Clock, Plus, Trash2 } from "lucide-react";

import { EmptyState } from "@/components/ui";
import { cn } from "@/utils/cn";

import { GroupTask } from "../../api/groupAssignmentService";

interface Props {
  tasks: GroupTask[];
  newTaskTitle: string;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onTaskTitleChange: (title: string) => void;
  onAddTask: () => void;
  onDeleteTask?: (id: string, title: string) => void;
}

export function GroupTasksTab({
  tasks,
  newTaskTitle,
  onToggleStatus,
  onTaskTitleChange,
  onAddTask,
  onDeleteTask,
}: Props) {
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="p-6 flex flex-col flex-1">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Daftar Tugas Kelompok
        </h3>
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {completedCount}/{tasks.length} Selesai
        </span>
      </div>
      <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {tasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-8 h-8" />}
            title="Belum ada sub-tugas"
            description="Tambahkan sub-tugas di bawah"
          />
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-200 dark:hover:border-indigo-700 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <button
                  onClick={() => onToggleStatus(task.id, task.status)}
                  aria-label={`Ubah status: ${task.note || "Tugas"}`}
                  className={cn(
                    "w-6 h-6 rounded flex items-center justify-center border transition-colors",
                    task.status === "completed"
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : task.status === "in_progress"
                        ? "bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600"
                        : "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-transparent hover:border-indigo-400",
                  )}
                >
                  {task.status === "completed" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : task.status === "in_progress" ? (
                    <Clock className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-20 text-indigo-600" />
                  )}
                </button>
                <div>
                  <p
                    className={cn(
                      "font-bold text-sm transition-colors",
                      task.status === "completed"
                        ? "text-slate-400 line-through"
                        : "text-slate-800 dark:text-slate-200",
                    )}
                  >
                    {task.note || "Tugas"}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Penanggung Jawab:{" "}
                    {task.profiles
                      ? `${task.profiles.first_name} ${task.profiles.last_name}`
                      : "Belum ditugaskan"}
                  </p>
                </div>
              </div>
              {onDeleteTask && (
                <button
                  type="button"
                  aria-label={`Hapus tugas: ${task.note || "Tugas"}`}
                  onClick={() => onDeleteTask(task.id, task.note || "Tugas")}
                  className="p-2 text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => onTaskTitleChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAddTask()}
            placeholder="Tambah sub-tugas baru..."
            className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            onClick={onAddTask}
            disabled={!newTaskTitle.trim()}
            aria-label="Tambah sub-tugas"
            className="px-4 py-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 font-bold rounded-xl transition-colors disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
