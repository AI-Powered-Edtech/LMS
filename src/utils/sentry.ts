// EduSync LMS — Sentry error tracking + performance monitoring
import * as Sentry from "@sentry/react";

/** Patterns to strip from event payloads — tokens, passwords, secrets */
const SENSITIVE_KEYS =
  /token|password|secret|authorization|cookie|session|apikey|api_key|credentials/i;

/**
 * Recursively scrub values whose keys match sensitive patterns.
 * Returns a shallow-cloned object with matched values replaced by `[Filtered]`.
 */
function scrubSensitiveData<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(scrubSensitiveData) as unknown as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.test(key)) {
      result[key] = "[Filtered]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = scrubSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return; // Skip in dev if no DSN configured

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
      Sentry.browserTracingIntegration({
        // Track page-load and navigation transactions automatically
        enableLongTask: true,
        enableInp: true,
      }),
      Sentry.replayIntegration({
        maskAllText: true, // Mask all text fields to prevent PII capture
        blockAllMedia: true, // Block media elements from being recorded
      }),
    ],

    // Only send to Sentry in production
    enabled: import.meta.env.PROD,

    beforeBreadcrumb(breadcrumb) {
      // Strip Authorization headers from HTTP breadcrumbs
      if (breadcrumb.category === "xhr" || breadcrumb.category === "fetch") {
        const headers = breadcrumb.data?.headers as
          | Record<string, string>
          | undefined;
        if (headers) {
          const cleaned = { ...headers };
          for (const key of Object.keys(cleaned)) {
            if (/^authorization$/i.test(key)) {
              cleaned[key] = "[Filtered]";
            }
          }
          breadcrumb.data = { ...breadcrumb.data, headers: cleaned };
        }

        // Also strip authorization from request headers if present
        const requestHeaders = breadcrumb.data?.requestHeaders as
          | Record<string, string>
          | undefined;
        if (requestHeaders) {
          const cleaned = { ...requestHeaders };
          for (const key of Object.keys(cleaned)) {
            if (/^authorization$/i.test(key)) {
              cleaned[key] = "[Filtered]";
            }
          }
          breadcrumb.data = { ...breadcrumb.data, requestHeaders: cleaned };
        }
      }

      return breadcrumb;
    },

    beforeSend(event) {
      // Scrub cookies
      if (event.request?.cookies) delete event.request.cookies;

      // Scrub user email
      if (event.user?.email) {
        event.user.email = "[Filtered]";
      }

      // Scrub request headers
      if (event.request?.headers) {
        event.request.headers = scrubSensitiveData(event.request.headers);
      }

      // Scrub request data (POST bodies, query strings)
      if (event.request?.data) {
        event.request.data = scrubSensitiveData(
          event.request.data as Record<string, unknown>,
        ) as typeof event.request.data;
      }

      // Scrub query strings
      if (event.request?.query_string) {
        if (typeof event.request.query_string === "string") {
          // Replace token/password values in query strings
          event.request.query_string = event.request.query_string.replace(
            /(token|password|secret|apikey|api_key|authorization|session)=([^&]*)/gi,
            "$1=[Filtered]",
          );
        }
      }

      // Scrub breadcrumb data for sensitive keys
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((bc) => ({
          ...bc,
          data: bc.data ? scrubSensitiveData(bc.data) : bc.data,
        }));
      }

      // Scrub extra context
      if (event.extra) {
        event.extra = scrubSensitiveData(event.extra);
      }

      return event;
    },
  });
}

export function setSentryUser(id: string, role: string): void {
  Sentry.setUser({ id, role });
}

export function clearSentryUser(): void {
  Sentry.setUser(null);
}

export function captureError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  if (context) Sentry.setContext("extra", context);
  Sentry.captureException(error);
}

export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, unknown>,
): void {
  Sentry.addBreadcrumb({ message, category, data, level: "info" });
}

export { Sentry };
