import { object, string, optional, parse, pipe, url, minLength } from 'valibot'
import type { InferOutput } from 'valibot'

/**
 * Environment variable schema for EduSync LMS.
 *
 * Required vars will cause the app to fail fast on startup.
 * Optional vars degrade gracefully (features disabled).
 */
const envSchema = object({
  // ── Required ────────────────────────────────────────────
  VITE_SUPABASE_URL: pipe(string(), url(), minLength(1)),
  VITE_SUPABASE_ANON_KEY: pipe(string(), minLength(1)),

  // ── Optional ────────────────────────────────────────────
  VITE_SENTRY_DSN: optional(string()),
  VITE_DEV_PASSWORD: optional(string()),
  VITE_VAPID_PUBLIC_KEY: optional(string()),
})

export type AppEnv = InferOutput<typeof envSchema>

/**
 * Validate `import.meta.env` against the schema.
 *
 * Throws a descriptive error in development and shows
 * a fallback UI-friendly message in production.
 */
export function validateEnv(): AppEnv {
  try {
    return parse(envSchema, {
      VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_DEV_PASSWORD: import.meta.env.VITE_DEV_PASSWORD,
      VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    })
  } catch {
    const root = document.getElementById('root')
    if (root) {
      root.innerHTML = `
        <div style="padding:2rem;font-family:monospace;color:#b91c1c;">
          <h1>Konfigurasi Bermasalah</h1>
          <p>Variabel environment belum lengkap. Cek <code>.env.example</code>.</p>
          <p>Buka DevTools Console untuk detail.</p>
        </div>`
    }
    throw new Error('ENV_VALIDATION_FAILED')
  }
}
