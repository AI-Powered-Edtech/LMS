import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type { LessonMonitorData } from "../types";

// ── Lesson Monitor API ───────────────────────────────────────────────────────

/**
 * Fetches live lesson progress data for teacher monitoring dashboard.
 * Uses RPC get_lesson_progress_monitor to get real-time progress data.
 */
export async function fetchLessonMonitorData(
  courseId: string,
  tenantId: string,
): Promise<LessonMonitorData> {
  const empty: LessonMonitorData = {
    liveProgress: [],
    studentActivity: [],
    timeline: [],
    summary: {
      totalActiveStudents: 0,
      totalLessonsInProgress: 0,
      studentsNeedingHelp: 0,
      averageCompletionRate: 0,
    },
  };

  const { data, error } = await db.rpc("get_lesson_progress_monitor", {
    p_course_id: courseId,
    p_tenant_id: tenantId,
  });

  if (error) {
    // RPC belum tersedia / belum di-allowlist BE → degrade ke payload kosong
    // agar halaman tetap menampilkan empty state Beta, bukan banner error merah.
    const status = error.status;
    const code = error.code;
    if (
      code === "PGRST202" ||
      status === 403 ||
      status === 404 ||
      status === 501
    ) {
      if (import.meta.env.DEV) {
        logger.warn(
          `get_lesson_progress_monitor RPC unavailable (code=${code} status=${status ?? "n/a"}), returning empty payload`,
        );
      }
      return empty;
    }
    if (import.meta.env.DEV) {
      logger.error("Failed to fetch lesson monitor data:", error);
    }
    throw new Error("Gagal memuat data monitor pelajaran. Silakan coba lagi.");
  }

  return (data as LessonMonitorData) || empty;
}
