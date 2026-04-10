# Acceptance Criteria — Phase 3: Edge Functions → VIL Services

**Gate 4 Exit Criteria — ALL items must pass before Phase 4**

---

## AI Functions Requirements (3A)

### ai-grade-essay

- [ ] Essay grading returns score + feedback dalam Bahasa Indonesia
- [ ] Rubric-based scoring works correctly
- [ ] CircuitBreaker prevents API cascade failure
- [ ] AI quota enforced (50/hr per user)
- [ ] Rate limiting works (50/hr, 429 after threshold)

### ai-tutor

- [ ] Conversation state persists across requests
- [ ] Context injection from lesson + student progress works
- [ ] System prompt includes struggle topics
- [ ] Streaming response works via SseCollect
- [ ] Message history trim (max 50 messages)

### generate-ai-content

- [ ] Content types: explanation, summary, exercise, example
- [ ] Content validation (profanity filter)
- [ ] Quality scoring works
- [ ] Indonesian output guaranteed

### generate-course-outline

- [ ] Course outline generation from title + description
- [ ] Module + lesson structure returned
- [ ] CircuitBreaker active

### generate-lesson-draft

- [ ] Lesson draft from outline topic
- [ ] Bahasa Indonesia output
- [ ] CircuitBreaker active

### generate-quiz-from-content

- [ ] Question generation from lesson content
- [ ] Multiple choice, true/false, short answer
- [ ] Question validation
- [ ] Difficulty setting works

### recommend-learning-path

- [ ] Path recommendation based on student progress
- [ ] Returns ordered list of courses/lessons
- [ ] CircuitBreaker active

### check-plagiarism

- [ ] Plagiarism score returned (0-100)
- [ ] Source highlights returned
- [ ] CircuitBreaker active

---

## LTI 1.3 Requirements (3B)

### lti-oidc-login

- [ ] Platform registration lookup works
- [ ] Nonce generation and storage
- [ ] Auth redirect URL constructed correctly
- [ ] Redirect to platform works

### lti-launch

- [ ] id_token validation (RS256)
- [ ] Nonce replay prevention
- [ ] Claims extraction works
- [ ] Guest user creation works
- [ ] JWT generation and redirect
- [ ] Canvas sandbox tested

### lti-jwks

- [ ] Public key retrieval works
- [ ] JWKS format correct
- [ ] No authentication required

### lti-grade-passback

- [ ] Grade submission to platform works
- [ ] Score format matches LTI AGS spec
- [ ] Error handling for unreachable platforms

---

## Notification & Communication Requirements (3C)

### send-email-digest

- [ ] Daily digest sent at 17:00 WIB
- [ ] Activities from last 24h included
- [ ] HTML template renders correctly
- [ ] Per-tenant send works

### send-parent-digest

- [ ] Parent-child links resolved
- [ ] Child activities + attendance + grades included
- [ ] Schedule at 17:30 WIB

### send-push

- [ ] Push subscription storage
- [ ] VAPID signature valid
- [ ] Message delivery to all user subscriptions
- [ ] Expired subscription cleanup

### whatsapp-webhook

- [ ] GET verification responds with challenge
- [ ] POST message handling works
- [ ] Phone-to-parent lookup works
- [ ] Message storage in DB

### send-parent-otp

- [ ] 6-digit OTP generation
- [ ] 5-minute expiry enforcement
- [ ] WhatsApp message sending
- [ ] OTP verification works

---

## Processing & Background Jobs Requirements (3D)

### grade-quiz-attempt

- [ ] Queue polling works
- [ ] Answer grading correct
- [ ] Score calculation accurate
- [ ] Submission status updated

### process-progress-events

- [ ] Batch processing works
- [ ] student_lesson_signals updated
- [ ] Schedule every 30 seconds

### progress-events

- [ ] Event enqueue endpoint works
- [ ] Validation enforced

### transform-course-content

- [ ] Content transformation pipeline works
- [ ] Input/output format validated

### scorm-extract

- [ ] ZIP extraction works
- [ ] Manifest parsing (imsmanifest.xml)
- [ ] Content file storage
- [ ] SCORM content in sandboxed iframe

### video-webhook

- [ ] Transcoding status webhook received
- [ ] Video status updated in DB

### generate-pdf

- [ ] Certificate PDF generation works
- [ ] Indonesian font (Noto Sans) embedded
- [ ] Name truncation for long names
- [ ] Correct PDF download

### generate-executive-report

- [ ] Executive report PDF generated
- [ ] Tenant-scoped data only

### generate-parent-report

- [ ] Parent report PDF generated
- [ ] Child data correctly included

### bulk-import-users

- [ ] CSV parsing works
- [ ] User creation with tenant
- [ ] Duplicate detection
- [ ] Rollback on error

### load-quiz-data

- [ ] Questions retrieved with tenant scope
- [ ] Options retrieved correctly
- [ ] Pagination works

### check-rate-limit

- [ ] Rate limit check returns allow/deny
- [ ] Configurable per-endpoint limits

### health-check

- [ ] Returns service status JSON
- [ ] No authentication required

---

## Cron Jobs Requirements (3E)

- [ ] Email digest daily at 17:00 WIB (UTC 10:00)
- [ ] Parent digest daily at 17:30 WIB (UTC 10:30)
- [ ] Analytics refresh every 15 minutes
- [ ] Cleanup daily at 02:00 WIB (UTC 19:00)
- [ ] AI quota reset monthly 1st 00:00 WIB
- [ ] XAPI flush every 30 seconds
- [ ] All pg_cron jobs migrated

---

## Bash-Executable Verification Commands

Run these after deploying each category. Replace `$TOKEN` with a valid JWT from test login. Replace `$SERVICE_TOKEN` with service role key.

### AI Functions Verification

```bash
# ai-grade-essay
curl -sf -X POST http://localhost:8080/api/v1/ai/grade-essay \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"essay_text":"Test essay","rubric_id":"test"}' \
  | jq -e '.score' && echo "PASS: ai-grade-essay" || echo "FAIL: ai-grade-essay"

# ai-tutor
curl -sf -X POST http://localhost:8080/api/v1/ai/tutor \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message":"Halo","lesson_id":"test"}' \
  | jq -e '.response' && echo "PASS: ai-tutor" || echo "FAIL: ai-tutor"

# generate-ai-content
curl -sf -X POST http://localhost:8080/api/v1/ai/generate-content \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content_type":"explanation","topic":"test"}' \
  | jq -e '.content' && echo "PASS: generate-ai-content" || echo "FAIL: generate-ai-content"

# generate-course-outline
curl -sf -X POST http://localhost:8080/api/v1/ai/generate-course-outline \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Matematika Dasar","description":"Kursus matematika"}' \
  | jq -e '.outline' && echo "PASS: generate-course-outline" || echo "FAIL: generate-course-outline"

# generate-lesson-draft
curl -sf -X POST http://localhost:8080/api/v1/ai/generate-lesson-draft \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"topic":"Aljabar","module_id":"test"}' \
  | jq -e '.draft' && echo "PASS: generate-lesson-draft" || echo "FAIL: generate-lesson-draft"

# generate-quiz-from-content
curl -sf -X POST http://localhost:8080/api/v1/ai/generate-quiz \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id":"test","difficulty":"medium"}' \
  | jq -e '.questions' && echo "PASS: generate-quiz-from-content" || echo "FAIL: generate-quiz-from-content"

# recommend-learning-path
curl -sf -X POST http://localhost:8080/api/v1/ai/recommend-learning-path \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":"test"}' \
  | jq -e '.path' && echo "PASS: recommend-learning-path" || echo "FAIL: recommend-learning-path"

# check-plagiarism
curl -sf -X POST http://localhost:8080/api/v1/ai/check-plagiarism \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Sample submission text"}' \
  | jq -e '.score' && echo "PASS: check-plagiarism" || echo "FAIL: check-plagiarism"
```

### LTI Functions Verification

```bash
# lti-jwks (public, no auth)
curl -sf http://localhost:8080/api/v1/lti/jwks \
  | jq -e '.keys[0].kty' && echo "PASS: lti-jwks" || echo "FAIL: lti-jwks"

# lti-oidc-login (returns redirect, expect 302 or login_hint error)
curl -sf -o /dev/null -w "%{http_code}" \
  "http://localhost:8080/api/v1/lti/oidc-login?iss=https://canvas.test&login_hint=test" \
  | grep -qE "302|400" && echo "PASS: lti-oidc-login" || echo "FAIL: lti-oidc-login"

# lti-launch (expects id_token, will return 400 without valid token — that is correct behavior)
curl -sf -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8080/api/v1/lti/launch \
  -d "id_token=invalid" \
  | grep -q "400" && echo "PASS: lti-launch (rejects invalid token)" || echo "FAIL: lti-launch"

# lti-grade-passback (requires valid LTI session)
curl -sf -o /dev/null -w "%{http_code}" \
  -X POST http://localhost:8080/api/v1/lti/grade-passback \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"score":0.85,"user_id":"test","resource_id":"test"}' \
  | grep -qE "200|400" && echo "PASS: lti-grade-passback" || echo "FAIL: lti-grade-passback"
```

### Email / Notification Functions Verification

```bash
# send-email-digest (service role)
curl -sf -X POST http://localhost:8080/api/v1/email/digest \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test"}' \
  | jq -e '.sent_count' && echo "PASS: send-email-digest" || echo "FAIL: send-email-digest"

# send-parent-digest (service role)
curl -sf -X POST http://localhost:8080/api/v1/email/parent-digest \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test"}' \
  | jq -e '.sent_count' && echo "PASS: send-parent-digest" || echo "FAIL: send-parent-digest"

# send-push
curl -sf -X POST http://localhost:8080/api/v1/push/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"test","title":"Test","body":"Hello"}' \
  | jq -e '.status' && echo "PASS: send-push" || echo "FAIL: send-push"

# whatsapp-webhook GET verification
curl -sf "http://localhost:8080/api/v1/whatsapp/webhook?hub.mode=subscribe&hub.challenge=test123&hub.verify_token=$WHATSAPP_VERIFY_TOKEN" \
  | grep -q "test123" && echo "PASS: whatsapp-webhook GET" || echo "FAIL: whatsapp-webhook GET"

# send-parent-otp (service role)
curl -sf -X POST http://localhost:8080/api/v1/whatsapp/send-otp \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+628123456789"}' \
  | jq -e '.otp_sent' && echo "PASS: send-parent-otp" || echo "FAIL: send-parent-otp"
```

### Processing Functions Verification

```bash
# grade-quiz-attempt (service role, background worker)
curl -sf -X POST http://localhost:8080/api/v1/grading/trigger \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  | jq -e '.processed' && echo "PASS: grade-quiz-attempt" || echo "FAIL: grade-quiz-attempt"

# process-progress-events (service role)
curl -sf -X POST http://localhost:8080/api/v1/progress/process \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  | jq -e '.processed' && echo "PASS: process-progress-events" || echo "FAIL: process-progress-events"

# progress-events (user JWT)
curl -sf -X POST http://localhost:8080/api/v1/progress/events \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"lesson_view","lesson_id":"test"}' \
  | jq -e '.queued' && echo "PASS: progress-events" || echo "FAIL: progress-events"

# transform-course-content
curl -sf -X POST http://localhost:8080/api/v1/content/transform \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"course_id":"test","format":"html"}' \
  | jq -e '.status' && echo "PASS: transform-course-content" || echo "FAIL: transform-course-content"

# generate-pdf
curl -sf -X POST http://localhost:8080/api/v1/pdf/certificate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_name":"Test Student","course_name":"Test Course"}' \
  -o /tmp/test-cert.pdf && file /tmp/test-cert.pdf | grep -q "PDF" \
  && echo "PASS: generate-pdf" || echo "FAIL: generate-pdf"

# generate-executive-report (service role)
curl -sf -X POST http://localhost:8080/api/v1/pdf/executive-report \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tenant_id":"test"}' \
  -o /tmp/test-exec.pdf && file /tmp/test-exec.pdf | grep -q "PDF" \
  && echo "PASS: generate-executive-report" || echo "FAIL: generate-executive-report"

# generate-parent-report (service role)
curl -sf -X POST http://localhost:8080/api/v1/pdf/parent-report \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"student_id":"test","parent_id":"test"}' \
  -o /tmp/test-parent.pdf && file /tmp/test-parent.pdf | grep -q "PDF" \
  && echo "PASS: generate-parent-report" || echo "FAIL: generate-parent-report"

# bulk-import-users (service role)
curl -sf -X POST http://localhost:8080/api/v1/import/users \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/dev/null" \
  | jq -e '.status' && echo "PASS: bulk-import-users" || echo "FAIL: bulk-import-users"

# scorm-extract
curl -sf -X POST http://localhost:8080/api/v1/scorm/extract \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/dev/null" \
  | jq -e '.status' && echo "PASS: scorm-extract" || echo "FAIL: scorm-extract"

# video-webhook
curl -sf -X POST http://localhost:8080/api/v1/webhooks/video \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"video_id":"test","status":"completed"}' \
  | jq -e '.status' && echo "PASS: video-webhook" || echo "FAIL: video-webhook"
```

### Utility Functions Verification

```bash
# health-check (no auth)
curl -sf http://localhost:8080/api/v1/health \
  | jq -e '.status' && echo "PASS: health-check" || echo "FAIL: health-check"

# load-quiz-data
curl -sf -X POST http://localhost:8080/api/v1/quiz/load \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"quiz_id":"test"}' \
  | jq -e '.questions' && echo "PASS: load-quiz-data" || echo "FAIL: load-quiz-data"

# check-rate-limit (service role)
curl -sf -X POST http://localhost:8080/api/v1/rate-limit/check \
  -H "Authorization: Bearer $SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"key":"test","limit":100}' \
  | jq -e '.allowed' && echo "PASS: check-rate-limit" || echo "FAIL: check-rate-limit"
```

### Full Sweep (run all 30 at once)

```bash
PASS=0; FAIL=0
# Run health-check as smoke test first
curl -sf http://localhost:8080/api/v1/health | jq -e '.status' > /dev/null 2>&1 && ((PASS++)) || ((FAIL++))
echo "Quick smoke: health-check done"
echo "Run individual category blocks above for full verification"
echo "Total functions to verify: 30"
```

---

## Integration Test Requirements

### AI E2E Tests

- [ ] ai-grade-essay: teacher submits essay → returns grade + feedback
- [ ] ai-tutor: student chat → streaming response → state saved
- [ ] generate-ai-content: teacher generates → content returned
- [ ] generate-course-outline: teacher provides title → outline returned
- [ ] generate-lesson-draft: teacher provides topic → draft returned
- [ ] generate-quiz: teacher generates → questions returned
- [ ] recommend-learning-path: student requests → path returned
- [ ] check-plagiarism: teacher submits text → score returned

### LTI E2E Tests

- [ ] lti-oidc-login: platform initiates → redirect to platform
- [ ] lti-launch: platform callback → JWT + redirect to app
- [ ] lti-jwks: platform fetches → JWKS returned
- [ ] lti-grade-passback: VIL sends grade → platform receives

### Communication E2E Tests

- [ ] send-email-digest: cron runs → emails sent
- [ ] send-push: notification sent → received on device
- [ ] send-parent-otp: request → OTP sent via WhatsApp
- [ ] whatsapp-webhook: incoming message → stored in DB

### Processing E2E Tests

- [ ] grade-quiz-attempt: background runs → grades calculated
- [ ] progress-events: event logged → signals updated
- [ ] generate-pdf: request → PDF downloaded
- [ ] generate-executive-report: request → PDF downloaded
- [ ] generate-parent-report: request → PDF downloaded
- [ ] scorm-extract: ZIP uploaded → content extracted
- [ ] bulk-import-users: CSV uploaded → users created
- [ ] transform-course-content: content submitted → transformed output
- [ ] video-webhook: webhook received → status updated

---

## Code Quality Requirements

- [ ] `cargo check --all-targets` → 0 errors
- [ ] `cargo clippy -- -D warnings` → 0 warnings
- [ ] `cargo test` → all tests pass
- [ ] No hardcoded secrets or credentials
- [ ] No `TODO` comments in production code
- [ ] All public APIs documented with doc comments
- [ ] Error messages in Bahasa Indonesia

---

## Infrastructure Requirements

- [ ] All 30 Edge Functions ported to Rust
- [ ] Zero Deno functions remaining
- [ ] Nginx routes all `/api/v1/*` to VIL
- [ ] Cron jobs using vil_trigger_cron
- [ ] Docker Compose builds successfully
- [ ] CI/CD pipeline runs on push/PR

---

## Known Gaps (Acknowledged but Not Blocking)

| Gap                   | Status     | Addressed In |
| --------------------- | ---------- | ------------ |
| WhatsApp Business API | Deferred   | Config-based |
| SCORM in iframe       | Limitation | By design    |
| PDF font embedded     | Done       | Task 3C-7    |

---

## Decision Point

**If ANY of the following fail → STOP, investigate further:**

1. AI functions return errors for >10% of requests
2. CircuitBreaker not preventing cascade failures
3. LTI Canvas/Moodle test failures
4. Cron jobs not executing
5. PDF generation fails for long names

**If all criteria pass → Proceed to Phase 4**

---

**Phase 3 Status: COMPLETE (when all 30 functions pass)**
**Gate 4: Requires all verification commands above to PASS**
**Ready for Phase 4: Only after Gate 4 passes**
