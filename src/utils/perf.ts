import { logger } from "@/utils/logger";
export const PERF = {
  LOGIN_START: "login_start",
  LOGIN_AUTH_COMPLETE: "login_auth_complete",
  LOGIN_DASHBOARD_RENDERED: "login_dashboard_rendered",

  COURSE_NAV_START: "course_nav_start",
  COURSE_DATA_LOADED: "course_data_loaded",
  COURSE_RENDERED: "course_rendered",

  QUIZ_START: "quiz_start",
  QUIZ_DATA_LOADED: "quiz_data_loaded",
  QUIZ_SUBMIT: "quiz_submit",
  QUIZ_GRADED: "quiz_graded",
};

export function perfMark(name: string) {
  if (typeof performance !== "undefined" && performance.mark) {
    performance.mark(name);
  }
}

export function perfMeasure(
  name: string,
  startMark: string,
  endMark: string,
): number | null {
  try {
    const entry = performance.measure(name, startMark, endMark);
    if (import.meta.env.DEV) {
      logger.info(`⏱ ${name}: ${entry.duration.toFixed(0)}ms`);
    }
    return entry.duration;
  } catch {
    return null;
  }
}

export function perfMeasureFrom(
  name: string,
  startMark: string,
  endMark: string = "tti",
) {
  perfMark(endMark);
  return perfMeasure(name, startMark, endMark);
}
