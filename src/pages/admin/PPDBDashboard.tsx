import { PPDBDashboard as PPDBDashboardFeature } from "@/features/administration/components/PPDBDashboard";
import { usePageTitle } from "@/hooks/usePageTitle";

export function PPDBDashboard() {
  usePageTitle("Dasbor PPDB");

  return (
    <div className="p-6">
      <PPDBDashboardFeature />
    </div>
  );
}
