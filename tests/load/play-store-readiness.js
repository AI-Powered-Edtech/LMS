// k6 Play Store readiness scenario
//
// Simulates production-like concurrency for the EduSync quiz flow:
// login -> load quiz -> submit an answer -> think time.
//
// Run:
//   BASE_URL=https://api.edusync.example.com k6 run tests/load/play-store-readiness.js
//
// Thresholds are tuned to match the SLO/SLI targets documented in
// docs/SLO_SLI.md (p95 < 1.5s API latency, < 1% error rate).

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Trend } from 'k6/metrics';


export const options = {
  scenarios: {
    quiz_session: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 500 }, // ramp up
        { duration: '20m', target: 500 }, // sustain peak
        { duration: '5m', target: 0 }, // ramp down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // < 1% failed requests
    http_req_duration: ['p(95)<1500'], // p95 < 1.5s
    quiz_submission_time: ['p(95)<500'], // p95 submission < 500ms
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:8080';
const submissionTime = new Trend('quiz_submission_time', true);
const loginFails = new Counter('login_failures');

export default function () {
  group('login', function () {
    const res = http.post(
      `${BASE}/api/v1/auth/login`,
      JSON.stringify({
        email: `student+${__VU}@edusync.dev`,
        password: 'password123',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!check(res, { 'login 200': (r) => r.status === 200 })) {
      loginFails.add(1);
      return;
    }
    const token = res.json('access_token');

    group('load quiz', function () {
      http.get(`${BASE}/api/v1/quizzes/sample-quiz-id`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    });

    group('submit answer', function () {
      const start = Date.now();
      const sub = http.post(
        `${BASE}/api/v1/quiz-attempts/sample-attempt-id/answer`,
        JSON.stringify({ question_id: 'q1', answer: 'A' }),
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );
      submissionTime.add(Date.now() - start);
      check(sub, {
        'submit 200|201': (r) => r.status === 200 || r.status === 201,
      });
    });

    sleep(Math.random() * 3 + 1);
  });
}
