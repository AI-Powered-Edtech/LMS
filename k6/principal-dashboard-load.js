/**
 * K6 Load Test: Principal Executive Dashboard
 *
 * Skenario: 10 principals + 50 admins mengakses dashboard secara bersamaan.
 * Stages: ramp-up 15s -> hold 60s -> ramp-down 15s
 * Target: response time p95 < 3s, error rate < 1%
 *
 * Endpoints:
 *   - GET /rest/v1/rpc/get_executive_overview
 *   - GET /rest/v1/activity_events (aggregated)
 *
 * Cara menjalankan:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   TEST_USER_TOKEN=eyJ... \
 *   k6 run k6/principal-dashboard-load.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const errorRate = new Rate('errors')
const overviewDuration = new Trend('executive_overview_duration', true)
const activityDuration = new Trend('activity_events_duration', true)

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    { duration: '15s', target: 60 }, // ramp-up ke 60 VU (10 principal + 50 admin)
    { duration: '60s', target: 60 }, // tahan 60 VU selama 60 detik
    { duration: '15s', target: 0 }, // ramp-down ke 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // p95 < 3 detik
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
  // 1. Executive Overview (RPC)
  const overviewRes = http.post(
    `${BASE_URL}/rest/v1/rpc/get_executive_overview`,
    JSON.stringify({}),
    {
      headers,
      tags: { name: 'get_executive_overview' },
    }
  )

  overviewDuration.add(overviewRes.timings.duration)

  const overviewOk = check(overviewRes, {
    'executive_overview status 200': (r) => r.status === 200,
    'executive_overview has data': (r) => r.body && r.body.length > 2,
  })
  errorRate.add(!overviewOk)

  sleep(1)

  // 2. Activity Events (aggregated feed)
  const activityRes = http.get(
    `${BASE_URL}/rest/v1/activity_events?select=*&order=created_at.desc&limit=50`,
    {
      headers,
      tags: { name: 'activity_events' },
    }
  )

  activityDuration.add(activityRes.timings.duration)

  const activityOk = check(activityRes, {
    'activity_events status 200': (r) => r.status === 200,
  })
  errorRate.add(!activityOk)

  sleep(1)
}
