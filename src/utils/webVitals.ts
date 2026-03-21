// EduSync LMS — Core Web Vitals monitoring
// Dev: coloured console badges. Prod: 10 % sample → activity_events table.

import { onCLS, onLCP, onFCP, onTTFB, onINP } from 'web-vitals'
import type { Metric } from 'web-vitals'
import { supabase } from '@/src/services/supabase/client'

/* ─── Helpers ──────────────────────────────────────────────── */

const isDev = import.meta.env.DEV

const badgeColors: Record<string, string> = {
  LCP: '#2563eb',
  INP: '#7c3aed',
  CLS: '#dc2626',
  FCP: '#059669',
  TTFB: '#d97706',
}

function ratingEmoji(rating: Metric['rating']): string {
  if (rating === 'good') return '[GOOD]'
  if (rating === 'needs-improvement') return '[NEEDS IMPROVEMENT]'
  return '[POOR]'
}

function logMetricDev(metric: Metric): void {
  const color = badgeColors[metric.name] ?? '#6b7280'
  console.log(
    `%c ${metric.name} %c ${metric.value.toFixed(1)} ${ratingEmoji(metric.rating)}`,
    `background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold`,
    'color:inherit'
  )
}

async function sendMetricProd(metric: Metric): Promise<void> {
  // 10 % sampling
  if (Math.random() > 0.1) return

  try {
    await supabase.from('activity_events').insert({
      event_type: 'WEB_VITAL',
      event_data: {
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      },
    })
  } catch {
    // Silently drop — vitals are non-critical telemetry
  }
}

function handleMetric(metric: Metric): void {
  if (isDev) {
    logMetricDev(metric)
  } else {
    sendMetricProd(metric)
  }
}

/* ─── Public API ───────────────────────────────────────────── */

/**
 * Start collecting Core Web Vitals.
 * Call once at app startup (e.g. main.tsx).
 */
export function reportWebVitals(): void {
  onLCP(handleMetric)
  onFCP(handleMetric)
  onTTFB(handleMetric)
  onCLS(handleMetric)
  onINP(handleMetric)
}
