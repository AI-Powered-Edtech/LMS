/**
 * Structured Logger
 *
 * Enriches log entries with context fields required for production observability:
 * tenant_id, user_id, role, feature/module, request_id, release version.
 *
 * Usage:
 *   import { logger } from '@/utils/logger'
 *   logger.info('quiz.submitted', { quizId, score })
 *   logger.error('auth.failed', { reason: 'invalid_token' })
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  tenantId?: string
  userId?: string
  role?: string
  feature?: string
  requestId?: string
  release?: string
  [key: string]: unknown
}

interface LogEntry {
  level: LogLevel
  event: string
  timestamp: string
  release: string
  requestId: string
  context: LogContext
  data?: Record<string, unknown>
}

// Singleton context — set once at app init / auth change
let _ctx: LogContext = {}

/** Set global log context (call on auth change, tenant load, etc.) */
export function setLogContext(ctx: LogContext): void {
  _ctx = { ..._ctx, ...ctx }
}

/** Clear log context (call on logout) */
export function clearLogContext(): void {
  _ctx = {}
}

/** Get current log context snapshot */
export function getLogContext(): LogContext {
  return { ..._ctx }
}

function formatEntry(level: LogLevel, event: string, data?: Record<string, unknown>): LogEntry {
  return {
    level,
    event,
    timestamp: new Date().toISOString(),
    release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
    requestId: _ctx.requestId ?? crypto.randomUUID().slice(0, 8),
    context: { ..._ctx },
    data,
  }
}

function emit(level: LogLevel, event: string, data?: Record<string, unknown>): void {
  const entry = formatEntry(level, event, data)

  // In production, emit to Sentry breadcrumbs if available
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    ;(window as any).Sentry.addBreadcrumb({
      message: event,
      level: level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info',
      data: { ...entry.context, ...entry.data },
      timestamp: Date.now() / 1000,
    })
  }

  // Always write to console (no-op in prod for debug/info to reduce noise)
  if (level === 'warn' || level === 'error') {
    console[level](`[${entry.release}] ${event}`, entry)
  } else if (import.meta.env.DEV) {
    console.log(`[${level.toUpperCase()}] ${event}`, entry)
  }
}

export const logger = {
  debug: (event: string, data?: Record<string, unknown>) => emit('debug', event, data),
  info: (event: string, data?: Record<string, unknown>) => emit('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => emit('error', event, data),
}
