import { Loader2, Plus, Trash2, UserPlus, Users, X } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useState } from "react";

import { useToast } from "@/components/ui";
import { cn } from "@/utils/cn";

import { CreateGroupInput } from "../../api/groupAssignmentService";
import { useEligibleStudents } from "../../hooks/useEligibleStudents";
import { useCreateGroups } from "../../hooks/useGroupAssignments";

interface Props {
  assignmentId: string;
  onClose: () => void;
}

interface GroupDraft {
  name: string;
  member_ids: string[];
}

export function CreateGroupModal({ assignmentId, onClose }: Props) {
  const addToast = useToast((s) => s.addToast);
  const { data: students = [], isLoading: loadingStudents } =
    useEligibleStudents(assignmentId, true);
  const createMutation = useCreateGroups(assignmentId);

  const [groups, setGroups] = useState<GroupDraft[]>([
    { name: "Kelompok 1", member_ids: [] },
  ]);

  // Students already picked in any draft group
  const assignedInDraft = new Set(groups.flatMap((g) => g.member_ids));

  // Available = enrolled + not already in an existing group + not picked in current draft
  const availableStudents = students.filter(
    (s) => !s.already_assigned && !assignedInDraft.has(s.user_id),
  );

  const addGroup = useCallback(() => {
    setGroups((prev) => [
      ...prev,
      { name: `Kelompok ${prev.length + 1}`, member_ids: [] },
    ]);
  }, []);

  const removeGroup = useCallback((index: number) => {
    setGroups((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateGroupName = useCallback((index: number, name: string) => {
    setGroups((prev) => prev.map((g, i) => (i === index ? { ...g, name } : g)));
  }, []);

  const addMemberToGroup = useCallback((groupIndex: number, userId: string) => {
    setGroups((prev) =>
      prev.map((g, i) =>
        i === groupIndex ? { ...g, member_ids: [...g.member_ids, userId] } : g,
      ),
    );
  }, []);

  const removeMemberFromGroup = useCallback(
    (groupIndex: number, userId: string) => {
      setGroups((prev) =>
        prev.map((g, i) =>
          i === groupIndex
            ? { ...g, member_ids: g.member_ids.filter((id) => id !== userId) }
            : g,
        ),
      );
    },
    [],
  );

  const getStudentName = useCallback(
    (userId: string) => {
      const s = students.find((st) => st.user_id === userId);
      return s?.display_name ?? "Tanpa Nama";
    },
    [students],
  );

  const handleSubmit = async () => {
    // Validate
    const emptyNames = groups.some((g) => !g.name.trim());
    if (emptyNames) {
      addToast({
        type: "error",
        message: "Semua kelompok harus memiliki nama.",
      });
      return;
    }

    const emptyGroups = groups.some((g) => g.member_ids.length === 0);
    if (emptyGroups) {
      addToast({
        type: "error",
        message: "Semua kelompok harus memiliki minimal 1 anggota.",
      });
      return;
    }

    const payload: CreateGroupInput[] = groups.map((g) => ({
      name: g.name.trim(),
      member_ids: g.member_ids,
    }));

    try {
      await createMutation.mutateAsync(payload);
      addToast({
        type: "success",
        message: `${groups.length} kelompok berhasil dibuat.`,
      });
      onClose();
    } catch {
      addToast({
        type: "error",
        message: "Gagal membuat kelompok. Coba lagi.",
      });
    }
  };

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
        aria-label="Buat Kelompok Baru"
        className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              Buat Kelompok Baru
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Atur kelompok dan tambahkan anggota dari siswa terdaftar.
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
          {loadingStudents ? (
            <div className="flex items-center justify-center py-12 text-slate-500 dark:text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Memuat daftar siswa...</span>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="font-medium">Tidak ada siswa terdaftar.</p>
              <p className="text-sm mt-1">
                Pastikan siswa sudah terdaftar di kelas untuk tugas ini.
              </p>
            </div>
          ) : (
            <>
              {/* Available students count */}
              <div className="text-sm text-slate-500 dark:text-slate-400">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {availableStudents.length}
                </span>{" "}
                siswa belum ditambahkan ke kelompok
              </div>

              {/* Group cards */}
              {groups.map((group, gi) => (
                <div
                  key={gi}
                  className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <label htmlFor={`group-name-${gi}`} className="sr-only">
                      Nama Kelompok {gi + 1}
                    </label>
                    <input
                      id={`group-name-${gi}`}
                      type="text"
                      value={group.name}
                      onChange={(e) => updateGroupName(gi, e.target.value)}
                      placeholder={`Kelompok ${gi + 1}`}
                      className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    {groups.length > 1 && (
                      <button
                        onClick={() => removeGroup(gi)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        aria-label={`Hapus ${group.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Members */}
                  {group.member_ids.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {group.member_ids.map((uid) => (
                        <span
                          key={uid}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full"
                        >
                          {getStudentName(uid)}
                          <button
                            onClick={() => removeMemberFromGroup(gi, uid)}
                            className="hover:text-red-500 transition-colors"
                            aria-label={`Hapus ${getStudentName(uid)} dari kelompok`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add member dropdown */}
                  {availableStudents.length > 0 && (
                    <div className="relative">
                      <label htmlFor={`add-member-${gi}`} className="sr-only">
                        Tambah anggota ke {group.name}
                      </label>
                      <select
                        id={`add-member-${gi}`}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            addMemberToGroup(gi, e.target.value);
                          }
                        }}
                        className={cn(
                          "w-full px-3 py-2 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600",
                          "rounded-xl text-sm text-slate-500 dark:text-slate-400",
                          "focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer",
                        )}
                      >
                        <option value="">
                          + Tambah anggota ({availableStudents.length} tersedia)
                        </option>
                        {availableStudents.map((s) => (
                          <option key={s.user_id} value={s.user_id}>
                            {s?.display_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {group.member_ids.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <UserPlus className="w-3.5 h-3.5" />
                      Belum ada anggota. Pilih siswa dari dropdown di atas.
                    </p>
                  )}
                </div>
              ))}

              {/* Add group button */}
              <button
                onClick={addGroup}
                className="w-full py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tambah Kelompok
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="flex-1 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={
              createMutation.isPending ||
              groups.length === 0 ||
              students.length === 0
            }
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {createMutation.isPending && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            Buat {groups.length} Kelompok
          </button>
        </div>
      </motion.div>
    </div>
  );
}
