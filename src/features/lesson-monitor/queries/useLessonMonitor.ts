import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/contexts/AuthContext";
import { STALE } from "@/utils/queryConstants";

import { fetchLessonMonitorData } from "../api/lessonMonitorApi";

export const lessonMonitorKeys = {
  all: (tenantId: string) => ["lesson-monitor", tenantId] as const,
  course: (tenantId: string, courseId: string) =>
    ["lesson-monitor", tenantId, "course", courseId] as const,
  presence: (tenantId: string, lessonId: string) =>
    ["lesson-monitor", tenantId, "presence", lessonId] as const,
};

/**
 * Query hook untuk data monitor pelajaran secara real-time.
 * Mengambil data progress siswa, aktivitas, dan timeline events.
 */
export function useLessonMonitorData(courseId: string) {
  const { tenantId, activeRole } = useAuth();
  const shouldPoll = activeRole === "teacher" || activeRole === "admin";

  return useQuery({
    queryKey: lessonMonitorKeys.course(tenantId!, courseId),
    queryFn: () => fetchLessonMonitorData(courseId, tenantId!),
    enabled: !!tenantId && !!courseId,
    staleTime: STALE.REALTIME,
    refetchInterval: shouldPoll ? 30_000 : false, // Poll every 30 seconds for teachers
    refetchIntervalInBackground: false,
  });
}
