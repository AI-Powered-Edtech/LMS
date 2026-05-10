import { useCallback, useMemo, useState } from "react";

import type { StudentActivityData } from "../types";

export interface ActivityAlert {
  id: string;
  studentId: string;
  studentName: string;
  type: "stuck" | "inactive" | "slow_progress";
  message: string;
  severity: "low" | "medium" | "high";
  timestamp: Date;
}

/**
 * Derive activity alerts from student activity data.
 *
 * NOTE: uses `useMemo` (not `useEffect + setState`) to avoid infinite
 * re-render loops when the caller passes a fresh array reference on every
 * render (e.g. `data?.studentActivity ?? []`). An earlier version set state
 * inside an effect whose dep was the array reference itself, which caused
 * setState → re-render → new `[]` → dep-changed → setState forever.
 *
 * Dismissals are tracked separately as a Set of alert ids so that dismissing
 * an alert does not re-trigger derivation.
 */
export function useActivityAlerts(studentActivity: StudentActivityData[]) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(
    () => new Set(),
  );

  const allAlerts = useMemo<ActivityAlert[]>(() => {
    // Use a single `now` per derivation so values stay stable across this pass.
    const now = new Date();
    const result: ActivityAlert[] = [];

    for (const student of studentActivity) {
      const lastActivity = new Date(student.lastActivity);
      const minutesSinceActivity =
        (now.getTime() - lastActivity.getTime()) / (1000 * 60);

      // Alert if student has been inactive for more than 5 minutes.
      if (minutesSinceActivity > 5 && student.status === "inactive") {
        result.push({
          id: `inactive-${student.studentId}`,
          studentId: student.studentId,
          studentName: student.studentName,
          type: "inactive",
          message: `Belum aktif selama ${Math.round(minutesSinceActivity)} menit`,
          severity: minutesSinceActivity > 15 ? "high" : "medium",
          timestamp: now,
        });
      }

      // Alert if student seems stuck (low progress but has been active).
      if (
        student.status === "active" &&
        student.progress < 30 &&
        student.timeSpent > 10
      ) {
        result.push({
          id: `stuck-${student.studentId}`,
          studentId: student.studentId,
          studentName: student.studentName,
          type: "stuck",
          message: `Sepertinya terjebak - progress rendah (${student.progress}%) setelah ${student.timeSpent} menit`,
          severity: "medium",
          timestamp: now,
        });
      }

      // Alert if student is progressing very slowly.
      if (
        student.status === "active" &&
        student.progress > 0 &&
        student.timeSpent > 20 &&
        student.progress / student.timeSpent < 1
      ) {
        result.push({
          id: `slow-${student.studentId}`,
          studentId: student.studentId,
          studentName: student.studentName,
          type: "slow_progress",
          message: `Progress lambat - hanya ${student.progress}% dalam ${student.timeSpent} menit`,
          severity: "low",
          timestamp: now,
        });
      }
    }

    return result;
  }, [studentActivity]);

  const alerts = useMemo(
    () => allAlerts.filter((a) => !dismissedIds.has(a.id)),
    [allAlerts, dismissedIds],
  );

  const dismissAlert = useCallback((alertId: string) => {
    setDismissedIds((prev) => {
      if (prev.has(alertId)) return prev;
      const next = new Set(prev);
      next.add(alertId);
      return next;
    });
  }, []);

  const getAlertsBySeverity = useCallback(
    (severity: ActivityAlert["severity"]) =>
      alerts.filter((alert) => alert.severity === severity),
    [alerts],
  );

  return {
    alerts,
    dismissAlert,
    getAlertsBySeverity,
    highPriorityAlerts: useMemo(
      () => alerts.filter((a) => a.severity === "high"),
      [alerts],
    ),
    mediumPriorityAlerts: useMemo(
      () => alerts.filter((a) => a.severity === "medium"),
      [alerts],
    ),
    lowPriorityAlerts: useMemo(
      () => alerts.filter((a) => a.severity === "low"),
      [alerts],
    ),
  };
}
