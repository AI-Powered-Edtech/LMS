// k6 Load Test Configuration
// Run with: k6 run tests/load/smoke.js
// Docs: https://k6.io/docs/

export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5173'
export const SUPABASE_URL = __ENV.VITE_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY = __ENV.VITE_SUPABASE_ANON_KEY || ''

export const TEST_ACCOUNTS = {
  teacher: { email: 'teacher@edusync.dev', password: 'password123' },
  student: { email: 'student@edusync.dev', password: 'password123' },
  admin: { email: 'admin@edusync.dev', password: 'password123' },
}

export const thresholds = {
  'http_req_duration{type:auth}': ['p(95)<500'],
  'http_req_duration{type:quiz}': ['p(95)<1000'],
  'http_req_duration{type:dashboard}': ['p(95)<2000'],
  'http_req_duration{type:gradebook}': ['p(95)<3000'],
  'http_req_duration{type:analytics}': ['p(95)<5000'],
  http_req_failed: ['rate<0.01'],
}
