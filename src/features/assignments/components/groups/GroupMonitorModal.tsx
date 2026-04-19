import {
  CheckCircle2,
  Clock,
  Loader2,
  MessageSquare,
  Users,
  X,
} from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/utils/cn";

import { type TeacherGroupEntry } from "../../api/groupAssignmentService";
import {
  useGroupMessages,
  useGroupTasks,
} from "../../hooks/useGroupAssignments";

interface Props {
  group: TeacherGroupEntry;
  onClose: () => void;
}

function statusLabel(status: string) {
  switch (status) {
    case "completed":
      return {
        label: "Selesai",
        cls: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
      };
    case "in_progress":
      return {
        label: "Dikerjakan",
        cls: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      };
    default:
      return {
        label: "Belum",
        cls: "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400",
      };
  }
}

export function GroupMonitorModal({ group, onClose }: Props) {
  const groupId = group.group_id;
  const { data: tasks = [], isLoading: tasksLoading } = useGroupTasks(groupId);
  const { data: messages = [], isLoading: messagesLoading } =
    useGroupMessages(groupId);

  const completedTasks = tasks.filter((t) => t.status === "completed").length;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        role="dialog"
        aria-modal="true"
        aria-label={`Pantau Kelompok: ${group.group_name}`}
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              {group.group_name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {group.member_count} anggota &middot;{" "}
              {tasks.length > 0
                ? `${completedTasks}/${tasks.length} sub-tugas selesai`
                : "Belum ada sub-tugas"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors text-slate-500"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Members */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" /> Anggota
            </h3>
            <div className="flex flex-wrap gap-2">
              {(group.members || []).map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                >
                  <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-xs font-bold">
                    {m.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {m.display_name}
                  </span>
                  {m.role === "leader" && (
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">
                      Ketua
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Sub-Tasks */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Sub-Tugas
            </h3>
            {tasksLoading ? (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Memuat...</span>
              </div>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Belum ada sub-tugas.
              </p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => {
                  const { label, cls } = statusLabel(task.status);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center gap-2">
                        {task.status === "completed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : task.status === "in_progress" ? (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                        )}
                        <span
                          className={cn(
                            "text-sm font-medium",
                            task.status === "completed" &&
                              "line-through text-slate-400",
                          )}
                        >
                          {task.note || "Tugas"}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "text-xs font-bold px-2 py-0.5 rounded-full",
                          cls,
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Chat */}
          <section>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> Pesan Terakhir
            </h3>
            {messagesLoading ? (
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Memuat...</span>
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                Belum ada pesan.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {messages.slice(-5).map((msg) => (
                  <div
                    key={msg.id}
                    className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700"
                  >
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                      {msg.profiles?.[0]?.display_name || "Anggota"}
                    </p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="w-full py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
}
