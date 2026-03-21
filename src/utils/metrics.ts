// EduSync LMS — Application metrics tracking
// Fire-and-forget: sends metrics to app_metrics table without blocking UI

import { supabase } from '@/src/services/supabase/client'

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
  name: MetricName,
  value: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  // Only in production to keep dev DB clean
  if (import.meta.env.DEV) return

  try {
    await supabase.from('app_metrics').insert({
      metric_name: name,
      metric_value: value,
      metadata: metadata ?? {},
    })
  } catch {
    // Metrics are non-critical — silently ignore errors
  }
}

/**
 * Measure how long an async operation takes and record it.
 */
export async function measureAsync<T>(
  name: MetricName,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  const start = performance.now()
  const result = await fn()
  const duration = performance.now() - start
  void trackMetric(name, duration, metadata)
  return result
}
