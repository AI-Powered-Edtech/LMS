import { valibotResolver } from "@hookform/resolvers/valibot";
import {
  BellRing,
  ClipboardList,
  FileText,
  Link as LinkIcon,
  MessageSquareText,
  Paperclip,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { type Resolver, useForm } from "react-hook-form";

import { OfflineFormNotice } from "@/components/ui/OfflineFormNotice";
import { useAuth } from "@/contexts/AuthContext";
import {
  RubricBuilder,
  RubricPreview,
  useRubricByAssignment,
} from "@/features/rubrics";
import {
  type AssignmentFormData,
  AssignmentFormSchema,
} from "@/shared/schemas/forms";
import { cn } from "@/utils/cn";

export interface NewAssignmentData extends AssignmentFormData {
  class: string;
  type: "individual" | "group";
}

interface CreateAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: NewAssignmentData) => void;
  /** ID of an existing assignment — used to load/save rubric */
  assignmentId?: string;
}

const INPUT_CLS =
  "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white aria-[invalid=true]:border-red-400";

type Tab = "detail" | "rubrik";

export function CreateAssignmentModal({
  isOpen,
  onClose,
  onCreate,
  assignmentId,
}: CreateAssignmentModalProps) {
  const { tenantId } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("detail");
  const [savedRubricId, setSavedRubricId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignmentFormData>({
    resolver: valibotResolver(
      AssignmentFormSchema,
    ) as unknown as Resolver<AssignmentFormData>,
    defaultValues: {
      title: "",
      description: "",
      due_date: "",
      max_score: 100,
      available_from: "",
      max_attempts: 1,
      late_penalty_percent: 0,
      allow_text_submission: true,
      allow_file_submission: true,
      allow_link_submission: false,
      reminder_enabled: true,
    },
  });

  // Fetch existing rubric if we have an assignment ID
  const { data: existingRubric } = useRubricByAssignment(
    assignmentId ?? null,
    tenantId,
  );

  const onSubmit = (data: AssignmentFormData) => {
    onCreate({
      ...data,
      class: "Semua Kelas Aktif",
      type: "individual",
    });
    reset();
  };

  const handleClose = () => {
    reset();
    setActiveTab("detail");
    setSavedRubricId(null);
    onClose();
  };

  const handleRubricSave = (rubricId: string) => {
    setSavedRubricId(rubricId);
    setActiveTab("detail");
  };

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "detail",
      label: "Detail Tugas",
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: "rubrik",
      label: "Rubrik",
      icon: <ClipboardList className="w-4 h-4" />,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Buat Tugas Baru
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Atur tenggat, percobaan, penalti, dan metode pengumpulan
                    native.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Tutup modal"
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-1 bg-white dark:bg-slate-900 shrink-0 border-b border-slate-100 dark:border-slate-800">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-bold transition-colors border-b-2 -mb-px",
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                  )}
                >
                  {tab.icon}
                  {tab.label}
                  {tab.id === "rubrik" && (existingRubric || savedRubricId) && (
                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
              {activeTab === "detail" && (
                <form
                  id="create-assignment-form"
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="p-6 space-y-6"
                >
                  <OfflineFormNotice />

                  <div className="space-y-1.5">
                    <label
                      htmlFor="ca-title"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Judul Tugas
                    </label>
                    <input
                      id="ca-title"
                      type="text"
                      {...register("title")}
                      placeholder="Contoh: Esai Sejarah Kemerdekaan"
                      aria-invalid={!!errors.title}
                      aria-describedby={
                        errors.title ? "ca-title-error" : undefined
                      }
                      className={INPUT_CLS}
                    />
                    {errors.title && (
                      <p
                        id="ca-title-error"
                        className="text-xs text-red-500 mt-1"
                      >
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="ca-description"
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    >
                      Petunjuk (Opsional)
                    </label>
                    <textarea
                      id="ca-description"
                      rows={4}
                      {...register("description")}
                      placeholder="Berikan instruksi yang jelas untuk siswa..."
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ca-max-score"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Poin Maksimal
                      </label>
                      <input
                        id="ca-max-score"
                        type="number"
                        {...register("max_score", { valueAsNumber: true })}
                        aria-invalid={!!errors.max_score}
                        aria-describedby={
                          errors.max_score ? "ca-max-score-error" : undefined
                        }
                        className={INPUT_CLS}
                      />
                      {errors.max_score && (
                        <p
                          id="ca-max-score-error"
                          className="text-xs text-red-500 mt-1"
                        >
                          {errors.max_score.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="ca-due-date"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Tenggat Waktu
                      </label>
                      <input
                        id="ca-due-date"
                        type="datetime-local"
                        {...register("due_date")}
                        aria-invalid={!!errors.due_date}
                        aria-describedby={
                          errors.due_date ? "ca-due-date-error" : undefined
                        }
                        className={INPUT_CLS}
                      />
                      {errors.due_date && (
                        <p
                          id="ca-due-date-error"
                          className="text-xs text-red-500 mt-1"
                        >
                          {errors.due_date.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="ca-available-from"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Tersedia Dari (Opsional)
                      </label>
                      <input
                        id="ca-available-from"
                        type="datetime-local"
                        {...register("available_from")}
                        className={INPUT_CLS}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="ca-max-attempts"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Maksimal Percobaan
                      </label>
                      <input
                        id="ca-max-attempts"
                        type="number"
                        {...register("max_attempts", { valueAsNumber: true })}
                        aria-invalid={!!errors.max_attempts}
                        aria-describedby={
                          errors.max_attempts
                            ? "ca-max-attempts-error"
                            : undefined
                        }
                        className={INPUT_CLS}
                      />
                      {errors.max_attempts && (
                        <p
                          id="ca-max-attempts-error"
                          className="text-xs text-red-500 mt-1"
                        >
                          {errors.max_attempts.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label
                        htmlFor="ca-late-penalty"
                        className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      >
                        Penalti Terlambat (%)
                      </label>
                      <input
                        id="ca-late-penalty"
                        type="number"
                        min="0"
                        max="100"
                        {...register("late_penalty_percent", {
                          valueAsNumber: true,
                        })}
                        aria-invalid={!!errors.late_penalty_percent}
                        aria-describedby={
                          errors.late_penalty_percent
                            ? "ca-late-penalty-error"
                            : undefined
                        }
                        className={INPUT_CLS}
                      />
                      {errors.late_penalty_percent && (
                        <p
                          id="ca-late-penalty-error"
                          className="text-xs text-red-500 mt-1"
                        >
                          {errors.late_penalty_percent.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      Jenis Pengumpulan
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <input
                          type="checkbox"
                          {...register("allow_text_submission")}
                          className="mt-1 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <MessageSquareText className="w-4 h-4 text-blue-500" />
                            Teks
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Jawaban ditulis langsung di aplikasi.
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <input
                          type="checkbox"
                          {...register("allow_file_submission")}
                          className="mt-1 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <Paperclip className="w-4 h-4 text-blue-500" />
                            File
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Satu file private per percobaan.
                          </p>
                        </div>
                      </label>
                      <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                        <input
                          type="checkbox"
                          {...register("allow_link_submission")}
                          className="mt-1 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                        />
                        <div>
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                            <LinkIcon className="w-4 h-4 text-blue-500" />
                            Link
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            URL eksternal untuk tugas yang di-host di luar LMS.
                          </p>
                        </div>
                      </label>
                    </div>
                    {errors.allow_text_submission && (
                      <p className="text-xs text-red-500">
                        {errors.allow_text_submission.message}
                      </p>
                    )}
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
                      <input
                        id="ca-reminder"
                        type="checkbox"
                        {...register("reminder_enabled")}
                        className="mt-1 w-4 h-4 text-blue-600 bg-slate-100 border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600"
                      />
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                          <BellRing className="w-4 h-4 text-blue-500" />
                          Aktifkan Pengingat
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Guru dapat mengirim reminder ke siswa yang belum
                          submit.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Rubric preview if one is attached */}
                  {existingRubric && !savedRubricId && (
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          Rubrik Terlampir
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveTab("rubrik")}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Edit Rubrik
                        </button>
                      </div>
                      <RubricPreview rubric={existingRubric} />
                    </div>
                  )}
                </form>
              )}

              {activeTab === "rubrik" && (
                <div className="p-6">
                  <RubricBuilder
                    assignmentId={assignmentId}
                    initialRubric={existingRubric ?? undefined}
                    onSave={handleRubricSave}
                    onCancel={() => setActiveTab("detail")}
                  />
                </div>
              )}
            </div>

            {/* Footer — only show submit button on detail tab */}
            {activeTab === "detail" && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 shrink-0 flex items-center justify-between bg-white dark:bg-slate-900">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Tugas dipublikasikan sebagai flow native EduSync.
                </span>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-5 py-2.5 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    form="create-assignment-form"
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 dark:shadow-none flex items-center gap-2"
                  >
                    Tugaskan
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
