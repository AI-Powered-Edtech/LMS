// EduSync LMS — Core Web Vitals monitoring
// Dev: coloured console badges. Prod: 10 % sample → activity_events table.

import type { Metric } from "web-vitals";
import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

import { db } from "@/services/db";
import { logger } from "@/utils/logger";

/* ─── Helpers ──────────────────────────────────────────────── */

const isDev = import.meta.env.DEV;

const badgeColors: Record<string, string> = {
  LCP: "#2563eb",
  INP: "#7c3aed",
  CLS: "#dc2626",
  FCP: "#059669",
  TTFB: "#d97706",
};

function ratingEmoji(rating: Metric["rating"]): string {
  if (rating === "good") return "[GOOD]";
  if (rating === "needs-improvement") return "[NEEDS IMPROVEMENT]";
  return "[POOR]";
}

function logMetricDev(metric: Metric): void {
  const color = badgeColors[metric.name] ?? "#6b7280";

  if (import.meta.env.DEV) {
    logger.warn(
      `%c ${metric.name} %c ${metric.value.toFixed(1)} ${ratingEmoji(metric.rating)}`,
      `background:${color};color:#fff;padding:2px 6px;border-radius:3px;font-weight:bold`,
      "color:inherit",
    );
  }
}

function currentRoute(): string {
  const hash = window.location.hash || "";
  const match = hash.match(/^#\/([^?]*)/);
  return match ? match[1] : window.location.pathname;
}

async function sendMetricProd(metric: Metric): Promise<void> {
  // 10 % sampling
  if (Math.random() > 0.1) return;

  // Post to dedicated Fase 7 table (Unit 52). Schema matches migration 059.
  if (!["LCP", "INP", "CLS", "FCP", "TTFB"].includes(metric.name)) return;
  try {
    await db.from("web_vitals_snapshots").insert({
      route: currentRoute(),
      metric: metric.name,
      value: Number(metric.value.toFixed(3)),
      rating: metric.rating ?? null,
      user_agent: navigator.userAgent.slice(0, 200),
    });
  } catch (err) {
    // Silently drop — vitals are non-critical telemetry
    if (import.meta.env.DEV)
      logger.warn("[webVitals] Failed to report metric:", err);
  }
}

function handleMetric(metric: Metric): void {
  if (isDev) {
    logMetricDev(metric);
  } else {
    void sendMetricProd(metric);
  }
}

/* ─── Public API ───────────────────────────────────────────── */

/**
 * Start collecting Core Web Vitals.
 * Call once at app startup (e.g. main.tsx).
 */
export function reportWebVitals(): void {
  onLCP(handleMetric);
  onFCP(handleMetric);
  onTTFB(handleMetric);
  onCLS(handleMetric);
  onINP(handleMetric);
}
