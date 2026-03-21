import http from 'k6/http'
import { check, sleep } from 'k6'
import { BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, thresholds } from './config.js'

// Smoke test: verify the platform is alive under minimal load.
// Purpose: run before every production deploy to catch hard failures quickly.
// Usage: k6 run tests/load/smoke.js
// Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, BASE_URL

export const options = {
  vus: 5,
  duration: '30s',
  thresholds,
}

export default function () {
  // 1. Health check — verify Edge Function runtime is responsive
  const healthRes = http.get(`${SUPABASE_URL}/functions/v1/health-check`, {
    tags: { type: 'auth' },
  })
  check(healthRes, { 'health check ok': (r) => r.status === 200 })

  // 2. Auth — sign in as student
  const authRes = http.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email: 'student@edusync.dev', password: 'password123' }),
    {
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      tags: { type: 'auth' },
    },
  )
  check(authRes, { 'auth successful': (r) => r.status === 200 })

  // 3. If auth succeeded, verify a basic authenticated query
  if (authRes.status === 200) {
    const token = authRes.json('access_token')

    const coursesRes = http.get(
      `${SUPABASE_URL}/rest/v1/courses?select=id,title&status=eq.published&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        tags: { type: 'dashboard' },
      },
    )
    check(coursesRes, { 'courses query ok': (r) => r.status === 200 })
  }

  sleep(1)
}
