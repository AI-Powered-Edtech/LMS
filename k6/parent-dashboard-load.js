/**
 * K6 Load Test: Parent Dashboard — Concurrent Access
 *
 * Skenario: 500 orang tua membuka dashboard secara bersamaan.
 * Stages: ramp-up 30s -> hold 60s -> ramp-down 30s
 * Target: response time p95 < 2s, error rate < 1%
 *
 * Endpoints:
 *   - GET /rest/v1/rpc/get_my_children
 *   - GET /rest/v1/gradebook_entries?student_id=eq.xxx
 *   - GET /rest/v1/attendance_records?student_id=eq.xxx
 *
 * Cara menjalankan:
 *   SUPABASE_URL=https://xxx.db.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   TEST_USER_TOKEN=eyJ... \
 *   k6 run k6/parent-dashboard-load.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const errorRate = new Rate('errors')
const childrenDuration = new Trend('get_children_duration', true)
const gradesDuration = new Trend('get_grades_duration', true)
const attendanceDuration = new Trend('get_attendance_duration', true)

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    { duration: '30s', target: 500 }, // ramp-up ke 500 VU
    { duration: '60s', target: 500 }, // tahan 500 VU selama 60 detik
    { duration: '30s', target: 0 }, // ramp-down ke 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // p95 < 2 detik
    errors: ['rate<0.01'], // error rate < 1%
  },
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const BASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321'
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || ''
const TOKEN = __ENV.TEST_USER_TOKEN || ''

const headers = {
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${TOKEN}`,
}

// ---------------------------------------------------------------------------
// Test scenario
// ---------------------------------------------------------------------------

export default function () {
  // 1. Ambil daftar anak
  const childrenRes = http.get(`${BASE_URL}/rest/v1/rpc/get_my_children`, {
    headers,
    tags: { name: 'get_my_children' },
  })

  childrenDuration.add(childrenRes.timings.duration)

  const childrenOk = check(childrenRes, {
    'get_my_children status 200': (r) => r.status === 200,
    'get_my_children has body': (r) => r.body && r.body.length > 0,
  })
  errorRate.add(!childrenOk)

  sleep(1)

  // Parse student_id dari response (gunakan ID pertama jika ada)
  let studentId = 'test-student-id'
  try {
    const children = JSON.parse(childrenRes.body)
    if (Array.isArray(children) && children.length > 0) {
      studentId = children[0].student_id || children[0].id || studentId
    }
  } catch (_) {
    // fallback ke default student ID
  }

  // 2. Ambil nilai siswa
  const gradesRes = http.get(
    `${BASE_URL}/rest/v1/gradebook_entries?student_id=eq.${studentId}&select=*&order=created_at.desc&limit=20`,
    {
      headers,
      tags: { name: 'get_gradebook' },
    }
  )

  gradesDuration.add(gradesRes.timings.duration)

  const gradesOk = check(gradesRes, {
    'gradebook status 200': (r) => r.status === 200,
  })
  errorRate.add(!gradesOk)

  sleep(1)

  // 3. Ambil data kehadiran siswa
  const attendanceRes = http.get(
    `${BASE_URL}/rest/v1/attendance_records?student_id=eq.${studentId}&select=*&order=date.desc&limit=30`,
    {
      headers,
      tags: { name: 'get_attendance' },
    }
  )

  attendanceDuration.add(attendanceRes.timings.duration)

  const attendanceOk = check(attendanceRes, {
    'attendance status 200': (r) => r.status === 200,
  })
  errorRate.add(!attendanceOk)

  sleep(1)
}
