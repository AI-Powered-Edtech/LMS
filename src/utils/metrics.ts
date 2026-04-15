// EduSync LMS — Application metrics tracking
// Fire-and-forget: sends metrics to app_metrics table without blocking UI

import { apiFetch } from '@/src/lib/api'

export type MetricName =
  | 'quiz.completion_rate'
  | 'quiz.avg_score'
  | 'lesson.avg_time_seconds'
  | 'page.load_time_ms'
  | 'error.rate'
  | 'user.daily_active'
  | 'api.response_time_ms'

/**
 * Track a metric value. Fire-and-forget — never throws.
 */
export async function trackMetric(
  _name: MetricName,
  _value: number,
  _metadata?: Record<string, unknown>
): Promise<void> {
  // Only in production to keep dev DB clean
  if (import.meta.env.DEV) return

  try {
    await apiFetch('/app_metrics')
  } catch {
    // Metrics are non-critical — silently ignore errors
  }
}
