import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { SUPABASE_URL, SUPABASE_ANON_KEY, thresholds } from './config.js'

/**
 * Stress Testing: Find system limits (0 to 2000 VU over 10m)
 * Focus: Identifying breakpoint and degradation patterns.
 */
export const options = {
  stages: [
    { duration: '2m', target: 200 },  // Level 1: 200 VU
    { duration: '2m', target: 500 },  // Level 2: 500 VU
    { duration: '2m', target: 1000 }, // Level 3: 1000 VU
    { duration: '2m', target: 1500 }, // Level 4: 1500 VU
    { duration: '2m', target: 2000 }, // Level 5: 2000 VU
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ...thresholds,
    'http_req_duration': ['p(95)<10000'], // Expect significant degradation
    'http_req_failed': ['rate<0.10'],      // 10% error threshold for breakpoint
  },
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  }

  group('Stress Auth and Querying', () => {
    const authRes = http.post(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      JSON.stringify({ email: 'student@edusync.dev', password: 'password123' }),
      { headers, tags: { type: 'auth' } }
    )
    check(authRes, { 'auth successful': (r) => r.status === 200 })

    if (authRes.status === 200) {
      const token = authRes.json('access_token')
      const authHeaders = {
        ...headers,
        Authorization: `Bearer ${token}`,
      }

      // 1. Dashboard - Course List (Database query performance)
      const coursesRes = http.get(
        `${SUPABASE_URL}/rest/v1/courses?select=id,title,status,created_at&limit=20`,
        { headers: authHeaders, tags: { type: 'dashboard' } }
      )
      check(coursesRes, { 'courses fetch ok': (r) => r.status === 200 })

      // 2. Quiz Engine - Question Fetch
      const quizRes = http.get(
        `${SUPABASE_URL}/rest/v1/quiz_questions?select=id,text,options&limit=10`,
        { headers: authHeaders, tags: { type: 'quiz' } }
      )
      check(quizRes, { 'quiz questions ok': (r) => r.status === 200 })

      // 3. Analytics - RPC call (Heavy database load)
      const analyticsRes = http.post(
        `${SUPABASE_URL}/rest/v1/rpc/get_teacher_analytics`,
        JSON.stringify({ p_course_id: '00000000-0000-0000-0000-000000000000' }), // Mock ID
        { headers: authHeaders, tags: { type: 'analytics' } }
      )
      check(analyticsRes, { 'analytics rpc attempted': (r) => r.status < 500 })
    }
  })

  sleep(0.1) // Aggressive stress with minimal sleep
}
