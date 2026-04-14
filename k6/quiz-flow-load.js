/**
 * K6 Load Test: Quiz Flow (Start, Pause, Resume, Submit)
 *
 * Skenario: 100 siswa mengerjakan kuis secara bersamaan.
 * Stages: ramp-up 20s -> hold 90s -> ramp-down 20s
 * Target: response time p95 < 2s, error rate < 1%
 *
 * Endpoints:
 *   - POST /rest/v1/rpc/v1_start_quiz_attempt
 *   - POST /rest/v1/rpc/pause_quiz_attempt
 *   - POST /rest/v1/rpc/resume_quiz_attempt
 *   - POST /rest/v1/rpc/v1_submit_quiz_attempt
 *
 * Cara menjalankan:
 *   SUPABASE_URL=https://xxx.db.co \
 *   SUPABASE_ANON_KEY=eyJ... \
 *   TEST_USER_TOKEN=eyJ... \
 *   TEST_QUIZ_ID=uuid-of-quiz \
 *   k6 run k6/quiz-flow-load.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// ---------------------------------------------------------------------------
// Custom metrics
// ---------------------------------------------------------------------------

const errorRate = new Rate('errors')
const startDuration = new Trend('quiz_start_duration', true)
const pauseDuration = new Trend('quiz_pause_duration', true)
const resumeDuration = new Trend('quiz_resume_duration', true)
const submitDuration = new Trend('quiz_submit_duration', true)

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export const options = {
  stages: [
    { duration: '20s', target: 100 }, // ramp-up ke 100 VU
    { duration: '90s', target: 100 }, // tahan 100 VU selama 90 detik
    { duration: '20s', target: 0 }, // ramp-down ke 0
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
const QUIZ_ID = __ENV.TEST_QUIZ_ID || 'test-quiz-id'

const headers = {
  'Content-Type': 'application/json',
  apikey: ANON_KEY,
  Authorization: `Bearer ${TOKEN}`,
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function rpc(fnName, payload, tags) {
  return http.post(`${BASE_URL}/rest/v1/rpc/${fnName}`, JSON.stringify(payload), { headers, tags })
}

// ---------------------------------------------------------------------------
// Test scenario: Full quiz flow
// ---------------------------------------------------------------------------

export default function () {
  // 1. Start quiz attempt
  const startRes = rpc('v1_start_quiz_attempt', { p_quiz_id: QUIZ_ID }, { name: 'start_quiz' })

  startDuration.add(startRes.timings.duration)

  const startOk = check(startRes, {
    'start quiz status 200': (r) => r.status === 200,
    'start quiz returns attempt': (r) => {
      try {
        const body = JSON.parse(r.body)
        return body && (body.attempt_id || body.id)
      } catch (_) {
        return false
      }
    },
  })
  errorRate.add(!startOk)

  // Parse attempt ID
  let attemptId = null
  try {
    const body = JSON.parse(startRes.body)
    attemptId = body.attempt_id || body.id || null
  } catch (_) {
    // continue with null
  }

  sleep(2)

  // 2. Pause quiz (simulasi siswa berhenti sementara)
  if (attemptId) {
    const pauseRes = rpc('pause_quiz_attempt', { p_attempt_id: attemptId }, { name: 'pause_quiz' })

    pauseDuration.add(pauseRes.timings.duration)

    const pauseOk = check(pauseRes, {
      'pause quiz status 200': (r) => r.status === 200,
    })
    errorRate.add(!pauseOk)

    sleep(3)

    // 3. Resume quiz
    const resumeRes = rpc(
      'resume_quiz_attempt',
      { p_attempt_id: attemptId },
      { name: 'resume_quiz' }
    )

    resumeDuration.add(resumeRes.timings.duration)

    const resumeOk = check(resumeRes, {
      'resume quiz status 200': (r) => r.status === 200,
    })
    errorRate.add(!resumeOk)

    sleep(2)

    // 4. Submit quiz
    //
    // Payload format for v1_submit_quiz_attempt:
    //   p_final_answers — array of normalized answer objects matching
    //   normalizeFinalAnswers() in quizTimerService.ts:
    //     { question_id: string, student_answers: string | string[] }
    //   • For multiple-choice: student_answers is an array of selected option IDs.
    //   • For text/essay:      student_answers is a plain string.
    const submitRes = rpc(
      'v1_submit_quiz_attempt',
      {
        p_attempt_id: attemptId,
        p_final_answers: [
          { question_id: 'q1', student_answers: ['opt-a'] },
          { question_id: 'q2', student_answers: ['opt-b'] },
          { question_id: 'q3', student_answers: ['opt-c'] },
        ],
      },
      { name: 'submit_quiz' }
    )

    submitDuration.add(submitRes.timings.duration)

    const submitOk = check(submitRes, {
      'submit quiz status 200': (r) => r.status === 200,
    })
    errorRate.add(!submitOk)
  }

  sleep(1)
}
