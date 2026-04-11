/**
 * K6 Stress Test: Bulk User Import
 *
 * Skenario: 5 concurrent bulk imports masing-masing 200 users.
 * Target: selesai < 30 detik per batch 200 users, error rate < 5%
 *
 * Endpoint:
 *   - POST /functions/v1/bulk-import-users
 *
 * Cara menjalankan:
 *   SUPABASE_URL=https://xxx.db.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   TEST_USER_TOKEN=eyJ... \
 *   k6 run k6/bulk-import-stress.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const errorRate = new Rate('errors')
const importDuration = new Trend('bulk_import_duration', true)

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  scenarios: {
    bulk_import: {
      executor: 'constant-vus',
      vus: 5,
      duration: '120s',
    },
  },
  thresholds: {
    bulk_import_duration: ['p(95)<30000'], // p95 < 30 detik
    errors: ['rate<0.05'], // error rate < 5%
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate array of 200 fake user rows untuk import.
 */
function generateUsers(batchId) {
  const users = []
  for (let i = 0; i < 200; i++) {
    users.push({
      email: `loadtest_vu${__VU}_b${batchId}_u${i}@test.edusync.id`,
      full_name: `Load Test User ${__VU}-${batchId}-${i}`,
      role: i % 3 === 0 ? 'teacher' : 'student',
      nis: i % 3 !== 0 ? `NIS${String(i).padStart(6, '0')}` : undefined,
    })
  }
  return users
}

// ---------------------------------------------------------------------------
// Test scenario
// ---------------------------------------------------------------------------

let batchCounter = 0

export default function () {
  batchCounter++

  const users = generateUsers(batchCounter)
  const payload = JSON.stringify({
    rows: users,
    tenantId: 'test-tenant-id',
    importJobId: `loadtest-job-${__VU}-${batchCounter}`,
  })

  const res = http.post(`${BASE_URL}/functions/v1/bulk-import-users`, payload, {
    headers,
    tags: { name: 'bulk_import_users' },
    timeout: '60s',
  })

  importDuration.add(res.timings.duration)

  const importOk = check(res, {
    'bulk import status 200': (r) => r.status === 200,
    'bulk import completed': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body.status === 'completed' || body.status === 'partial'
      } catch (_) {
        return false
      }
    },
    'bulk import < 30s': (r) => r.timings.duration < 30000,
  })
  errorRate.add(!importOk)

  // Cooldown antar batch
  sleep(5)
}
