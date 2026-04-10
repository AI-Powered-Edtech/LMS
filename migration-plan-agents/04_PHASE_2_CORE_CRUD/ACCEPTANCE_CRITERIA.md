# Acceptance Criteria — Phase 2

Dokumentasi ini menjabarkan kriteria keluar (exit criteria) untuk Phase 2: Core CRUD Migration. Setiap kriteria memiliki bash-executable verification command.

---

## Compile + Test Gate

Semua kode HARUS pass compile dan test sebelum review:

```bash
# Gate 0: Compile check
cd edusync-api && cargo check 2>&1 | tail -5
echo "---"

# Gate 0: Test check
cd edusync-api && cargo test 2>&1 | tail -10
echo "---"

# Gate 0: Frontend check
cd /home/rog/Documents/edusync1/LMS && pnpm typecheck 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
```

---

## Batch 1: Courses, Classes, Lessons

### Model Structs

```bash
# Verify all model files exist
cd edusync-api
for f in course.rs course_module.rs lesson.rs class.rs enrollment.rs course_collaborator.rs; do
  test -f crates/models/src/$f && echo "PASS: $f" || echo "FAIL: $f missing"
done
```

### CRUD Endpoints Respond

```bash
# Prerequisite: export TOKEN from login
# export TOKEN=$(curl -s http://localhost:8080/api/v1/auth/login \
#   -d '{"email":"teacher@edusync.dev","password":"password123"}' \
#   -H 'Content-Type: application/json' | jq -r '.access_token')

# All Batch 1 endpoints respond
for ep in courses classes; do
  curl -sf "http://localhost:8080/api/v1/$ep" \
    -H "Authorization: Bearer $TOKEN" | jq -e '.data' \
    && echo "PASS: GET /api/v1/$ep" \
    || echo "FAIL: GET /api/v1/$ep"
done

# Nested endpoints
curl -sf "http://localhost:8080/api/v1/courses" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id' | head -1 | while read CID; do
  curl -sf "http://localhost:8080/api/v1/courses/$CID/modules" \
    -H "Authorization: Bearer $TOKEN" | jq -e '.' \
    && echo "PASS: GET /api/v1/courses/:id/modules" \
    || echo "FAIL: GET /api/v1/courses/:id/modules"
done
```

### Course CRUD Lifecycle

```bash
# Create course
COURSE=$(curl -sf -X POST "http://localhost:8080/api/v1/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Acceptance Criteria"}')
CID=$(echo $COURSE | jq -r '.id')
test -n "$CID" && echo "PASS: create course" || echo "FAIL: create course"

# Read course
curl -sf "http://localhost:8080/api/v1/courses/$CID" \
  -H "Authorization: Bearer $TOKEN" | jq -e '.id' \
  && echo "PASS: get course" || echo "FAIL: get course"

# Update course
curl -sf -X PUT "http://localhost:8080/api/v1/courses/$CID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated Acceptance"}' | jq -e '.title' \
  && echo "PASS: update course" || echo "FAIL: update course"

# Delete course (soft)
curl -sf -X DELETE "http://localhost:8080/api/v1/courses/$CID" \
  -H "Authorization: Bearer $TOKEN" -w "%{http_code}" -o /dev/null | grep -q 204 \
  && echo "PASS: delete course" || echo "FAIL: delete course"
```

### Module CRUD with Reserved Word

```bash
# Verify "order" column works (reserved word — must be quoted in SQL)
COURSE=$(curl -sf -X POST "http://localhost:8080/api/v1/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Module Test"}')
CID=$(echo $COURSE | jq -r '.id')

MODULE=$(curl -sf -X POST "http://localhost:8080/api/v1/courses/$CID/modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Modul 1","order":1}')
echo $MODULE | jq -e '.order' \
  && echo "PASS: module with order field" || echo "FAIL: module order field"
```

### Lesson CRUD with Reserved Word

```bash
# Verify lessons."order" works
MID=$(echo $MODULE | jq -r '.id')
LESSON=$(curl -sf -X POST "http://localhost:8080/api/v1/modules/$MID/lessons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Pelajaran 1","order":1}')
echo $LESSON | jq -e '.order' \
  && echo "PASS: lesson with order field" || echo "FAIL: lesson order field"
```

### Enrollment Uses user_id (Not student_id)

```bash
# Create enrollment — verify column is user_id, not student_id
CLASS=$(curl -sf -X POST "http://localhost:8080/api/v1/classes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Kelas Test\",\"course_id\":\"$CID\"}")
CLASS_ID=$(echo $CLASS | jq -r '.id')

# This must use user_id in the request body
ENROLL=$(curl -sf -X POST "http://localhost:8080/api/v1/classes/$CLASS_ID/enrollments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"00000000-0000-0000-0000-000000000001"}')
echo $ENROLL | jq -e '.user_id' \
  && echo "PASS: enrollment uses user_id" || echo "FAIL: enrollment field name"
```

### RLS Guards

```bash
# Student cannot create course (role check)
STUDENT_TOKEN=$(curl -s http://localhost:8080/api/v1/auth/login \
  -d '{"email":"student@edusync.dev","password":"password123"}' \
  -H 'Content-Type: application/json' | jq -r '.access_token')

STATUS=$(curl -sf -X POST "http://localhost:8080/api/v1/courses" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Should Fail"}' -w "%{http_code}" -o /dev/null)
test "$STATUS" = "403" && echo "PASS: student blocked from create" || echo "FAIL: expected 403, got $STATUS"
```

### Integration Tests

```bash
cd edusync-api && cargo test integration::courses 2>&1 | grep -E "test result|FAILED" | tail -3
cd edusync-api && cargo test integration::lessons 2>&1 | grep -E "test result|FAILED" | tail -3
cd edusync-api && cargo test integration::classes 2>&1 | grep -E "test result|FAILED" | tail -3
cd edusync-api && cargo test integration::builder 2>&1 | grep -E "test result|FAILED" | tail -3
```

---

## Batch 2: Quizzes, Assignments, Gradebook

> Acceptance criteria for Batch 2 are in TASK_QUEUE_BATCH_2.md (separate worker).

### Quick Smoke Test

```bash
for ep in quizzes assignments gradebook; do
  curl -sf "http://localhost:8080/api/v1/$ep" \
    -H "Authorization: Bearer $TOKEN" -w "%{http_code}" -o /dev/null | grep -qE "200|404" \
    && echo "PASS: $ep responds" || echo "FAIL: $ep not responding"
done
```

---

## Batch 3: Analytics, Users, Progress

### Analytics RPC Endpoints

```bash
# All analytics endpoints respond (thin wrappers to stored procedures)
for ep in executive principal-overview teacher-dashboard student-progress; do
  curl -sf "http://localhost:8080/api/v1/analytics/$ep" \
    -H "Authorization: Bearer $TOKEN" -w "%{http_code}" -o /dev/null | grep -qE "200|403" \
    && echo "PASS: analytics/$ep responds" \
    || echo "FAIL: analytics/$ep not responding"
done

# Remaining analytics RPCs
for ep in attendance quiz assignment engagement class-performance student-ranking learning-path gamification-leaderboard; do
  curl -sf "http://localhost:8080/api/v1/analytics/$ep" \
    -H "Authorization: Bearer $TOKEN" -w "%{http_code}" -o /dev/null | grep -qE "200|403" \
    && echo "PASS: analytics/$ep responds" \
    || echo "FAIL: analytics/$ep not responding"
done
```

### Analytics Teacher Role Check via user_roles Table

```bash
# GOTCHA verification: teacher role checked via user_roles table, NOT has_role()
# This should succeed for teacher token
curl -sf "http://localhost:8080/api/v1/analytics/teacher-dashboard" \
  -H "Authorization: Bearer $TOKEN" | jq -e '.' \
  && echo "PASS: teacher dashboard works" || echo "FAIL: teacher dashboard"

# This should fail for student token
STATUS=$(curl -sf "http://localhost:8080/api/v1/analytics/teacher-dashboard" \
  -H "Authorization: Bearer $STUDENT_TOKEN" -w "%{http_code}" -o /dev/null)
test "$STATUS" = "403" && echo "PASS: student blocked from teacher dashboard" || echo "FAIL: expected 403"
```

### User Management CRUD

```bash
# List users (admin only)
ADMIN_TOKEN=$(curl -s http://localhost:8080/api/v1/auth/login \
  -d '{"email":"admin@edusync.dev","password":"password123"}' \
  -H 'Content-Type: application/json' | jq -r '.access_token')

curl -sf "http://localhost:8080/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -e '.data' \
  && echo "PASS: list users" || echo "FAIL: list users"

# Verify roles come from user_roles table (should have .roles array)
curl -sf "http://localhost:8080/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -e '.data[0].roles' \
  && echo "PASS: roles from user_roles table" || echo "FAIL: roles missing"
```

### Bulk Import

```bash
# Start import job
echo "email,full_name,role" > /tmp/test_import.csv
echo "test1@edusync.dev,Test User 1,student" >> /tmp/test_import.csv
echo "test2@edusync.dev,Test User 2,student" >> /tmp/test_import.csv

JOB=$(curl -sf -X POST "http://localhost:8080/api/v1/admin/bulk-import" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "file=@/tmp/test_import.csv")
JOB_ID=$(echo $JOB | jq -r '.id')
test -n "$JOB_ID" && echo "PASS: import job created" || echo "FAIL: import job"

# Check status
curl -sf "http://localhost:8080/api/v1/admin/bulk-import/$JOB_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -e '.status' \
  && echo "PASS: import status check" || echo "FAIL: import status"
```

### Progress Tracking

```bash
# Upsert lesson progress (last-write-wins)
curl -sf -X POST "http://localhost:8080/api/v1/progress/lesson" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lesson_id":"00000000-0000-0000-0000-000000000001","status":"in_progress","progress_pct":50}' \
  | jq -e '.status' \
  && echo "PASS: upsert lesson progress" || echo "FAIL: lesson progress"

# Batch signals — verify correct column names
# GOTCHA: total_time_spent, NOT time_spent_seconds
# GOTCHA: latest_quiz_score, NOT quiz_avg_score
curl -sf -X POST "http://localhost:8080/api/v1/progress/signals" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"signals":[{"lesson_id":"00000000-0000-0000-0000-000000000001","total_time_spent":120,"latest_quiz_score":85.0}]}' \
  -w "%{http_code}" -o /dev/null | grep -q 204 \
  && echo "PASS: batch signals" || echo "FAIL: batch signals"
```

### xAPI Idempotency

```bash
# Send same xAPI statement twice — both should return 200 (NOT 409)
BODY='{"verb":"completed","object_type":"lesson","object_id":"00000000-0000-0000-0000-000000000001"}'

STATUS1=$(curl -sf -X POST "http://localhost:8080/api/v1/xapi/statements" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY" -w "%{http_code}" -o /dev/null)

STATUS2=$(curl -sf -X POST "http://localhost:8080/api/v1/xapi/statements" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BODY" -w "%{http_code}" -o /dev/null)

test "$STATUS1" = "200" -a "$STATUS2" = "200" \
  && echo "PASS: xAPI idempotency (200 on duplicate)" \
  || echo "FAIL: expected 200+200, got $STATUS1+$STATUS2"
```

### xAPI Batch

```bash
BATCH='{"statements":[{"verb":"completed","object_type":"lesson","object_id":"00000000-0000-0000-0000-000000000002"},{"verb":"started","object_type":"lesson","object_id":"00000000-0000-0000-0000-000000000003"}]}'

curl -sf -X POST "http://localhost:8080/api/v1/xapi/statements/batch" \
  -H "Authorization: Bearer $STUDENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$BATCH" | jq -e 'length == 2' \
  && echo "PASS: xAPI batch" || echo "FAIL: xAPI batch"
```

---

## Batch 4: Remaining Modules

> Acceptance criteria for Batch 4 are in TASK_QUEUE_BATCH_4.md (separate worker).

### Quick Smoke Test

```bash
for ep in notifications discussions calendar attendance certificates gamification; do
  curl -sf "http://localhost:8080/api/v1/$ep" \
    -H "Authorization: Bearer $TOKEN" -w "%{http_code}" -o /dev/null | grep -qE "200|403|404" \
    && echo "PASS: $ep responds" || echo "FAIL: $ep not responding"
done
```

---

## Non-Functional Requirements

### Security: Tenant Isolation

```bash
# Verify all queries filter by tenant_id — grep Rust handler files
cd edusync-api
grep -rn "tenant_id" crates/server/src/handlers/ crates/server/src/routes/ | grep -c "tenant_id = \$" | while read COUNT; do
  test "$COUNT" -gt 0 && echo "PASS: $COUNT queries filter by tenant_id" || echo "FAIL: no tenant_id filters found"
done
```

### Security: No SELECT *

```bash
# Verify no SELECT * in handlers
cd edusync-api
STAR_COUNT=$(grep -rn "SELECT \*" crates/server/src/handlers/ crates/server/src/routes/ | wc -l)
test "$STAR_COUNT" -eq 0 \
  && echo "PASS: no SELECT * found" \
  || echo "FAIL: found $STAR_COUNT SELECT * occurrences"
```

### Security: Bind Parameters (No String Interpolation)

```bash
# Verify queries use $N bind parameters, not string interpolation
cd edusync-api
FORMAT_COUNT=$(grep -rn 'format!.*SELECT\|format!.*INSERT\|format!.*UPDATE\|format!.*DELETE' \
  crates/server/src/handlers/ crates/server/src/routes/ | grep -v "rpc_name" | wc -l)
test "$FORMAT_COUNT" -eq 0 \
  && echo "PASS: no SQL string interpolation" \
  || echo "WARN: $FORMAT_COUNT potential SQL interpolation (check manually)"
```

### Error Format: PostgREST-Compatible

```bash
# Verify 404 returns correct JSON format
STATUS=$(curl -sf "http://localhost:8080/api/v1/courses/00000000-0000-0000-0000-000000000000" \
  -H "Authorization: Bearer $TOKEN" -w "%{http_code}" -o /tmp/err.json)
test "$STATUS" = "404" && jq -e '.code and .message' /tmp/err.json > /dev/null \
  && echo "PASS: PostgREST error format" || echo "FAIL: error format"
```

### Performance

```bash
# Quiz fetch latency (must be <= 200ms)
TIME=$(curl -sf "http://localhost:8080/api/v1/quizzes" \
  -H "Authorization: Bearer $TOKEN" -w "%{time_total}" -o /dev/null)
echo "$TIME < 0.2" | bc -l | grep -q 1 \
  && echo "PASS: quiz fetch ${TIME}s <= 200ms" \
  || echo "FAIL: quiz fetch ${TIME}s > 200ms"
```

### Pagination Headers

```bash
# Verify X-Total-Count header or count in body
curl -sfI "http://localhost:8080/api/v1/courses" \
  -H "Authorization: Bearer $TOKEN" | grep -qi "x-total-count" \
  && echo "PASS: X-Total-Count header present" \
  || (curl -sf "http://localhost:8080/api/v1/courses" \
    -H "Authorization: Bearer $TOKEN" | jq -e '.count' > /dev/null \
    && echo "PASS: count in response body" \
    || echo "FAIL: no pagination count")
```

---

## Shadow Mode Requirements

```bash
# Verify shadow mode infrastructure exists
cd edusync-api
test -f crates/server/src/shadow.rs -o -d crates/shadow/ \
  && echo "PASS: shadow mode infra exists" \
  || echo "FAIL: shadow mode infra missing"

# Verify cutover flags exist
grep -rn "cutover\|feature_flag\|CUTOVER" crates/server/src/ | head -3
test $? -eq 0 && echo "PASS: cutover flags found" || echo "FAIL: cutover flags missing"
```

---

## Frontend Requirements

```bash
cd /home/rog/Documents/edusync1/LMS

# TypeScript compiles
pnpm typecheck 2>&1 | tail -3

# Lint passes
pnpm lint 2>&1 | tail -3

# Service files refactored — check for VIL endpoint usage
grep -rn "getApiClient\|/api/v1/" src/services/ src/features/*/api/ | head -5
test $? -eq 0 && echo "PASS: VIL endpoints in service files" || echo "FAIL: no VIL endpoints"
```

---

## SQL Reserved Words Verification

```bash
# Verify "order" is quoted in all SQL queries
cd edusync-api
UNQUOTED=$(grep -rn '"order"' crates/server/src/ | wc -l)
RAW=$(grep -rn ' order ' crates/server/src/ | grep -v '"order"' | grep -v 'ORDER BY' | grep -v '//' | wc -l)
echo "Quoted: $UNQUOTED, Unquoted: $RAW"
test "$RAW" -eq 0 \
  && echo "PASS: all order columns quoted" \
  || echo "FAIL: $RAW unquoted order references"
```

---

## Full Acceptance Gate

Run this single script to verify everything at once:

```bash
#!/usr/bin/env bash
set -e
PASS=0; FAIL=0

check() {
  if eval "$2" > /dev/null 2>&1; then
    echo "PASS: $1"; ((PASS++))
  else
    echo "FAIL: $1"; ((FAIL++))
  fi
}

# Compile gates
check "cargo check" "cd edusync-api && cargo check"
check "cargo test" "cd edusync-api && cargo test"
check "pnpm typecheck" "cd /home/rog/Documents/edusync1/LMS && pnpm typecheck"
check "pnpm lint" "cd /home/rog/Documents/edusync1/LMS && pnpm lint"

# Model files
for f in course.rs course_module.rs lesson.rs class.rs enrollment.rs; do
  check "model $f" "test -f edusync-api/crates/models/src/$f"
done

# Batch 3 model files
for f in analytics.rs user.rs progress.rs xapi.rs; do
  check "model $f" "test -f edusync-api/crates/models/src/$f"
done

# No SELECT *
check "no SELECT *" "test $(grep -rn 'SELECT \*' edusync-api/crates/server/src/ 2>/dev/null | wc -l) -eq 0"

echo ""
echo "=== RESULTS: $PASS passed, $FAIL failed ==="
test $FAIL -eq 0 && echo "ALL ACCEPTANCE CRITERIA MET" || echo "SOME CRITERIA FAILED"
```

---

## Exit Criteria

Phase 2 dianggap selesai jika:

1. Semua CRUD endpoint untuk Batch 1-4 ter-implement di VIL
2. Shadow mode berjalan untuk semua modul dengan dual-write
3. Integration tests passed
4. Frontend service layer refactored ke VIL
5. Security review passed (Gate 3)
6. RLS policies di-supports oleh Rust middleware
7. `cargo check && cargo test` passed
8. `pnpm typecheck && pnpm lint` passed (frontend)
9. Full Acceptance Gate script returns 0 failures
