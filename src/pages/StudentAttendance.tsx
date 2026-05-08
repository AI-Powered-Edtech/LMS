import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";
import { useMemo } from "react";

import { EmptyState } from "@/components/ui";
import { useAuth } from "@/contexts/AuthContext";
import {
  getStudentAttendance,
  type StudentAttendanceRecord,
} from "@/features/classroom/api/classSectionAdapter";
import { ProgressSkeleton } from "@/features/progress/components/ProgressSkeleton";
import { usePageTitle } from "@/hooks/usePageTitle";
import { formatDate } from "@/shared/utils/format-id";

const STATUS_CONFIG = {
  hadir: {
    label: "Hadir",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-100 dark:border-green-800",
    icon: CheckCircle,
  },
  sakit: {
    label: "Sakit",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-100 dark:border-yellow-800",
    icon: AlertCircle,
  },
  izin: {
    label: "Izin",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-100 dark:border-blue-800",
    icon: Clock,
  },
  alpha: {
    label: "Alpha",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-100 dark:border-red-800",
    icon: XCircle,
  },
};

export function StudentAttendance() {
  usePageTitle("Kehadiran Siswa");
  const { user, tenantId } = useAuth();

  // Student-side attendance roll-up. The classroom adapter merges
  // rombel_attendance (per-student daily) with attendance_records (legacy
  // per-class scan via enrollments) and normalizes status. See Issue #325.
  const { data: records = [], isLoading } = useQuery<StudentAttendanceRecord[]>(
    {
      queryKey: ["student-attendance", user?.id, tenantId],
      queryFn: () => getStudentAttendance(user!.id, tenantId!),
      enabled: !!tenantId && !!user,
    },
  );

  // Records are already filtered by student_id in the query above.
  // No name-based filtering — eliminates risk of leaking other students' data.
  // NOTE: The old schema had class-level `present_count`/`absent_count` columns.
  // The new per-student schema provides only `status` per record; class-aggregate
  // fields have been removed from the type and mapped object to avoid confusion.
  const { myRecords, totalHadir, totalAlpha, totalSakit } = useMemo(() => {
    const list = (records ?? []) as StudentAttendanceRecord[];
    return list.reduce(
      (acc, r) => {
        acc.myRecords.push({
          id: r.id,
          date: r.date,
          className: r.className,
          status: r.status,
        });
        if (r.status === "hadir") acc.totalHadir++;
        else if (r.status === "alpha") acc.totalAlpha++;
        else if (r.status === "sakit") acc.totalSakit++;
        return acc;
      },
      {
        myRecords: [] as Array<{
          id: string;
          date: string;
          className: string;
          status: string;
        }>,
        totalHadir: 0,
        totalAlpha: 0,
        totalSakit: 0,
      },
    );
  }, [records]);

  const pct =
    myRecords.length > 0
      ? Math.round((totalHadir / myRecords.length) * 100)
      : 0;

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  return (
    <div className="flex-1 bg-slate-50 dark:bg-slate-700/50 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Rekap Kehadiran
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Riwayat kehadiran kamu berdasarkan data scan guru.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Kehadiran",
              value: `${pct}%`,
              sub: `${totalHadir} pertemuan`,
              color: "bg-green-600 text-white",
            },
            {
              label: "Hadir",
              value: totalHadir,
              sub: "pertemuan",
              color:
                "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
            },
            {
              label: "Sakit",
              value: totalSakit,
              sub: "pertemuan",
              color:
                "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
            },
            {
              label: "Alpha",
              value: totalAlpha,
              sub: "pertemuan",
              color:
                "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-2xl p-4 shadow-sm ${s.color}`}
            >
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-1 ${s.color.includes("green-600") ? "text-green-100" : "text-slate-500 dark:text-slate-400"}`}
              >
                {s.label}
              </p>
              <p
                className={`text-3xl font-black ${s.color.includes("green-600") ? "text-white" : "text-slate-800 dark:text-slate-200"}`}
              >
                {s.value}
              </p>
              <p
                className={`text-xs mt-0.5 ${s.color.includes("green-600") ? "text-green-100" : "text-slate-400"}`}
              >
                {s.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Records list */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 dark:text-slate-200">
              Riwayat Pertemuan
            </h2>
          </div>
          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-slate-100 dark:bg-slate-700 rounded-xl animate-pulse"
                />
              ))}
            </div>
          ) : myRecords.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Calendar className="w-10 h-10" />}
                title="Belum ada data kehadiran"
                description="Data akan muncul setelah guru melakukan scan absensi."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {myRecords.map((r) => {
                const cfg =
                  STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] ??
                  STATUS_CONFIG.hadir;
                const Icon = cfg.icon;
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                        {r.className}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDate(r.date, {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.color} ${cfg.border}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
