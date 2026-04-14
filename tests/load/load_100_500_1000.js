import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { SUPABASE_URL, SUPABASE_ANON_KEY, thresholds } from './config.js'

/**
 * Load Testing: Comprehensive Scenario (100, 500, 1000 VU)
 * Focus: Response time, throughput, and database query performance.
 */
export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Level 1: 100 VU
    { duration: '3m', target: 100 },  // Sustained 100 VU
    { duration: '2m', target: 500 },  // Level 2: 500 VU
    { duration: '3m', target: 500 },  // Sustained 500 VU
    { duration: '2m', target: 1000 }, // Level 3: 1000 VU
    { duration: '3m', target: 1000 }, // Sustained 1000 VU
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds,
}

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
  }

  group('Authentication Flow', () => {
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

      group('Critical API Endpoints', () => {
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
        // We expect 404 or 400 if the mock ID is invalid, but we measure duration
        check(analyticsRes, { 'analytics rpc attempted': (r) => r.status < 500 })

        // 4. Gradebook - Recent Attempts
        const gradeRes = http.get(
          `${SUPABASE_URL}/rest/v1/quiz_attempts?select=id,score,passed,completed_at&order=completed_at.desc&limit=10`,
          { headers: authHeaders, tags: { type: 'gradebook' } }
        )
        check(gradeRes, { 'gradebook fetch ok': (r) => r.status === 200 })
      })
    }
  })

  sleep(1)
}
