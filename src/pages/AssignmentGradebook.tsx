import {
  ArrowLeft,
  Award,
  Clock,
  FileText,
  Loader2,
  Search,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui";
import { VirtualTable } from "@/components/ui/VirtualTable";
import { useAuth } from "@/contexts/AuthContext";
import {
  type Assignment,
  assignmentService,
  type AssignmentSubmission,
} from "@/features/assignments/api/assignmentService";
import { AssignmentCard } from "@/features/assignments/components/AssignmentCard";
import { GradingModal } from "@/features/assignments/components/GradingModal";
import { useLocaleFormatters } from "@/hooks/useLocaleFormatters";
import { usePageTitle } from "@/hooks/usePageTitle";
import { cn } from "@/utils/cn";
import { logger } from "@/utils/logger";
import { captureError } from "@/utils/sentry";
import { translateDbError } from "@/utils/statusTranslations";

export function AssignmentGradebook() {
  usePageTitle("Buku Nilai Tugas");
  const { user, tenantId } = useAuth();
  const { formatDate } = useLocaleFormatters();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);

  const [_loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [_error, setError] = useState<string | null>(null);

  const [gradingSubmission, setGradingSubmission] =
    useState<AssignmentSubmission | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    async function loadAssignments() {
      setLoading(true);
      try {
        const data = await assignmentService.getAssignmentsByTenant(tenantId!);
        setAssignments(data);
      } catch (err) {
        setError(
          translateDbError(err instanceof Error ? err.message : String(err)),
        );
      } finally {
        setLoading(false);
      }
    }
    void loadAssignments();
  }, [user?.id, tenantId]);

  const handleSelectAssignment = useCallback(
    async (assignment: Assignment) => {
      setSelectedAssignment(assignment);
      setLoadingSubmissions(true);
      try {
        const data = await assignmentService.getAssignmentSubmissions(
          assignment.id,
          tenantId!,
        );
        setSubmissions(data || []);
      } catch (err) {
        if (import.meta.env.DEV)
          logger.error("Error fetching submissions:", err);
        captureError(err, {
          context: "AssignmentGradebook.handleSelectAssignment",
        });
      } finally {
        setLoadingSubmissions(false);
      }
    },
    [tenantId],
  );

  const submissionColumns = useMemo(
    () => [
      {
        key: "student",
        header: "Siswa",
        render: (sub: AssignmentSubmission) => (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">
              {Array.isArray(sub.user_profiles)
                ? sub.user_profiles[0]?.full_name?.charAt(0)
                : sub.user_profiles?.full_name?.charAt(0) || "?"}
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">
              {Array.isArray(sub.user_profiles)
                ? sub.user_profiles[0]?.full_name
                : sub.user_profiles?.full_name || "Siswa"}
            </span>
          </div>
        ),
      },
      {
        key: "submitted_at",
        header: "Tanggal Pengiriman",
        render: (sub: AssignmentSubmission) => (
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {sub.submitted_at
              ? formatDate(sub.submitted_at, {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (_sub: AssignmentSubmission) => (
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-100 text-blue-700",
            )}
          >
            <Clock className="w-2.5 h-2.5" /> Sedang Diperiksa
          </span>
        ),
      },
      {
        key: "score",
        header: "Nilai",
        render: (_sub: AssignmentSubmission) => (
          <span className="font-bold text-slate-300">-</span>
        ),
      },
      {
        key: "actions",
        header: "Aksi",
        render: (sub: AssignmentSubmission) => (
          <button
            onClick={() => setGradingSubmission(sub)}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all transform active:scale-95 shadow-md shadow-blue-500/20"
          >
            {sub.status === "graded" ? "Edit Nilai" : "Nilai Sekarang"}
          </button>
        ),
      },
    ],
    [formatDate],
  );

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Buku Nilai Tugas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Kelola pengiriman tugas dan berikan penilaian kepada siswa.
          </p>
        </div>
        {!selectedAssignment && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari tugas..."
                className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
              />
            </div>
          </div>
        )}
      </header>

      {!selectedAssignment ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={<FileText className="w-8 h-8" />}
                title="Belum Ada Tugas"
                description="Buat tugas pertama Anda di Course Builder."
              />
            </div>
          ) : (
            assignments.map((assignment) => (
              <AssignmentCard
                key={assignment.id}
                assignment={assignment}
                onSelect={handleSelectAssignment}
              />
            ))
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedAssignment(null)}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke semua tugas
          </button>

          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-8">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/30">
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-200">
                {selectedAssignment.title}
              </h2>
              <div className="flex items-center gap-6 mt-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
                <span className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-500" />
                  Maksimum {selectedAssignment.max_points} Poin
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-500" />
                  {submissions.length} Pengiriman
                </span>
              </div>
            </div>

            {loadingSubmissions ? (
              <div className="px-8 py-12 text-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                Memuat pengiriman...
              </div>
            ) : (
              <VirtualTable<AssignmentSubmission>
                data={submissions}
                columns={submissionColumns}
                rowHeight={52}
                maxHeight={550}
                getRowKey={(sub) => sub.id}
                emptyState={
                  <div className="px-8 py-12 text-center text-slate-500 dark:text-slate-400 font-medium italic">
                    Belum ada siswa yang mengirimkan tugas.
                  </div>
                }
              />
            )}
          </div>
        </div>
      )}

      <GradingModal
        submission={gradingSubmission}
        assignment={selectedAssignment}
        tenantId={tenantId}
        onClose={() => setGradingSubmission(null)}
      />
    </div>
  );
}
