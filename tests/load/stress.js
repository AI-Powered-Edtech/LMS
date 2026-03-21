import http from 'k6/http'
import { check, sleep } from 'k6'
import { SUPABASE_URL, SUPABASE_ANON_KEY, thresholds } from './config.js'

// Stress test: ramp to 100 VUs over 5 minutes to find breaking points.
// Purpose: identify query latency degradation and connection pool limits under load.
// Usage: k6 run tests/load/stress.js
// Env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

export const options = {
  stages: [
    { duration: '1m', target: 10 }, // warm up
    { duration: '2m', target: 50 }, // ramp to moderate load
    { duration: '1m', target: 100 }, // peak stress
    { duration: '1m', target: 0 }, // ramp down
  ],
  thresholds,
}

export default function () {
  // 1. Auth flow
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
  check(authRes, { 'auth ok': (r) => r.status === 200 })

  if (authRes.status === 200) {
    const token = authRes.json('access_token')
    const headers = {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    }

    // 2. Dashboard: published courses list
    const dashRes = http.get(
      `${SUPABASE_URL}/rest/v1/courses?select=id,title&status=eq.published&limit=10`,
      { headers, tags: { type: 'dashboard' } },
    )
    check(dashRes, { 'dashboard ok': (r) => r.status === 200 })

    // 3. Quiz endpoint: fetch questions for a course module
    const quizRes = http.get(
      `${SUPABASE_URL}/rest/v1/quiz_questions?select=id,text&limit=10`,
      { headers, tags: { type: 'quiz' } },
    )
    check(quizRes, { 'quiz questions ok': (r) => r.status === 200 })

    // 4. Gradebook: recent quiz attempts (paginated)
    const gradeRes = http.get(
      `${SUPABASE_URL}/rest/v1/quiz_attempts?select=id,score,completed_at&order=completed_at.desc&limit=20`,
      { headers, tags: { type: 'gradebook' } },
    )
    check(gradeRes, { 'gradebook ok': (r) => r.status === 200 })
  }

  sleep(1)
}
