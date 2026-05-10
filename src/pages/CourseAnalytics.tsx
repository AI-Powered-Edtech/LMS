import { ArrowLeft, BarChart3 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { EmptyState } from "@/components/ui";
import { TeacherAnalyticsDashboard } from "@/features/analytics";
import { usePageTitle } from "@/hooks/usePageTitle";

export function CourseAnalytics() {
  usePageTitle("Analitik Kursus");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const courseId = searchParams.get("courseId");

  if (!courseId) {
    const emptyAction = {
      label: "Kembali",
      onClick: () => navigate(-1),
    };
    return (
      <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8 py-6 dark:bg-slate-900 dark:text-white">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Analitik Kursus
        </h1>
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="Pilih kursus untuk melihat analitik"
          description="Buka menu Analitik Kursus dari daftar kursus untuk menampilkan data pembelajaran per kursus."
          action={emptyAction}
        />
      </div>
    );
  }

  return (
    <div className="dark:bg-slate-900 dark:text-white">
      <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali
        </button>
      </div>
      <TeacherAnalyticsDashboard courseId={courseId} />
    </div>
  );
}
