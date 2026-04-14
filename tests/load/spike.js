import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { SUPABASE_URL, SUPABASE_ANON_KEY, thresholds } from './config.js'

/**
 * Spike Testing: Sudden traffic surge (0 to 1000 VU in 30s)
 * Focus: System responsiveness and recovery.
 */
export const options = {
  stages: [
    { duration: '30s', target: 1000 }, // Spike to 1000 VU
    { duration: '1m', target: 1000 },  // Sustained spike
    { duration: '30s', target: 0 },    // Quick ramp down
  ],
  thresholds: {
    ...thresholds,
    'http_req_duration': ['p(95)<5000'], // More lenient for spikes
    'http_req_failed': ['rate<0.05'],     // 5% error tolerance during spike
  },
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  }

  group('Spike Authentication and Dashboard Fetch', () => {
    const authRes = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: 'student@edusync.dev', password: 'password123' }),
      { headers, tags: { type: 'auth' } }
    )
    check(authRes, { 'auth ok': (r) => r.status === 200 })

    if (authRes.status === 200) {
      const token = authRes.json('access_token')
      const authHeaders = {
        ...headers,
        Authorization: `Bearer ${token}`,
      }

      const dashRes = http.get(
        `${SUPABASE_URL}/rest/v1/courses?select=id,title&status=eq.published&limit=10`,
        { headers: authHeaders, tags: { type: 'dashboard' } }
      )
      check(dashRes, { 'dashboard ok': (r) => r.status === 200 })
    }
  })

  sleep(0.5) // Less sleep during spike to simulate intense load
}
