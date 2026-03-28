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
      // Avoid innerHTML (even with static content) — use DOM API to prevent
      // any future accidental injection if template literals are extended
      root.textContent = ''
      const container = document.createElement('div')
      container.setAttribute('style', 'padding:2rem;font-family:monospace;color:#b91c1c;')

      const heading = document.createElement('h1')
      heading.textContent = 'Konfigurasi Bermasalah'

      const p1 = document.createElement('p')
      p1.textContent = 'Variabel environment belum lengkap. Cek '
      const code = document.createElement('code')
      code.textContent = '.env.example'
      p1.appendChild(code)
      p1.appendChild(document.createTextNode('.'))

      const p2 = document.createElement('p')
      p2.textContent = 'Buka DevTools Console untuk detail.'

      container.appendChild(heading)
      container.appendChild(p1)
      container.appendChild(p2)
      root.appendChild(container)
    }
    throw new Error('ENV_VALIDATION_FAILED')
  }
}
