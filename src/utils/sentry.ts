// EduSync LMS — Sentry error tracking + performance monitoring
import * as Sentry from '@sentry/react'

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return // Skip in dev if no DSN configured

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: `edusync-lms@1.0.0`,

    // Performance
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    // Only send to Sentry in production
    enabled: import.meta.env.PROD,

    beforeSend(event) {
      // Scrub sensitive data before sending
      if (event.request?.cookies) delete event.request.cookies
      if (event.user?.email) {
        event.user.email = '[Filtered]'
      }
      return event
    },
  })
}

export function setSentryUser(id: string, role: string): void {
  Sentry.setUser({ id, role })
}

export function clearSentryUser(): void {
  Sentry.setUser(null)
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (context) Sentry.setContext('extra', context)
  Sentry.captureException(error)
}

export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({ message, category, data, level: 'info' })
}

export { Sentry }
