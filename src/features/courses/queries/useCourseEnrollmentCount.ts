import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/services/db";

import { courseKeys } from "./courseKeys";

/**
 * Lightweight query hook that returns the number of classes a course is assigned to.
 * Reads from the course_classes join table.
 */
export function useCourseEnrollmentCount(courseId: string | null) {
  const { tenantId } = useAuth();

  return useQuery({
    queryKey: courseKeys.enrollmentCount(tenantId!, courseId!),
    queryFn: async () => {
      if (!courseId || !tenantId) return 0;

      const { count, error } = await db
        .from("course_classes")
        .select("id", { count: "exact", head: true })
        .eq("course_id", courseId)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!courseId && !!tenantId,
    staleTime: 60_000,
  });
}
