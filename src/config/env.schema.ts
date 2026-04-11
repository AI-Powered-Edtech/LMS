import type { InferOutput } from 'valibot'
import { object, optional, parse, string } from 'valibot'

/**
 * Environment variable schema for EduSync LMS.
 *
 * Required vars will cause the app to fail fast on startup.
 * Optional vars degrade gracefully (features disabled).
 */
const envSchema = object({
  // ── Optional (legacy Supabase — decommissioned in Phase 6) ────────────────
  VITE_SUPABASE_URL: optional(string()),
  VITE_SUPABASE_ANON_KEY: optional(string()),

  // ── Optional ────────────────────────────────────────────
  VITE_API_BACKEND: optional(string()),
  VITE_API_URL: optional(string()),
  VITE_VIL_SHADOW_MODE: optional(string()),
  VITE_VIL_SHADOW_SAMPLE_RATE: optional(string()),
  VITE_VIL_SHADOW_INCLUDE_PAYLOAD: optional(string()),
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
      VITE_API_BACKEND: import.meta.env.VITE_API_BACKEND,
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_VIL_SHADOW_MODE: import.meta.env.VITE_VIL_SHADOW_MODE,
      VITE_VIL_SHADOW_SAMPLE_RATE: import.meta.env.VITE_VIL_SHADOW_SAMPLE_RATE,
      VITE_VIL_SHADOW_INCLUDE_PAYLOAD: import.meta.env.VITE_VIL_SHADOW_INCLUDE_PAYLOAD,
      VITE_SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN,
      VITE_DEV_PASSWORD: import.meta.env.VITE_DEV_PASSWORD,
      VITE_VAPID_PUBLIC_KEY: import.meta.env.VITE_VAPID_PUBLIC_KEY,
    })
  } catch {
    const root = document.getElementById('root')
    if (root) {
      root.textContent = ''

      const wrapper = document.createElement('div')
      wrapper.style.padding = '2rem'
      wrapper.style.fontFamily = 'monospace'
      wrapper.style.color = '#b91c1c'

      const h1 = document.createElement('h1')
      h1.textContent = 'Konfigurasi Bermasalah'

      const p1 = document.createElement('p')
      p1.textContent = 'Variabel environment belum lengkap. Cek '
      const code = document.createElement('code')
      code.textContent = '.env.example'
      p1.appendChild(code)
      p1.appendChild(document.createTextNode('.'))

      const p2 = document.createElement('p')
      p2.textContent = 'Buka DevTools Console untuk detail.'

      wrapper.appendChild(h1)
      wrapper.appendChild(p1)
      wrapper.appendChild(p2)
      root.appendChild(wrapper)
    }
    throw new Error('ENV_VALIDATION_FAILED')
  }
}
