# G2 — AI tutor streaming smoke test runbook

Use this to verify token-by-token SSE streaming on `/api/v1/ai/tutor/stream` after deployment.

## Prereqs
- API binary running (locally `cargo run -p edusync-api-server` or in staging)
- `GROQ_API_KEY` exported (or in API env file)
- Postgres + at least one lesson + one student account seeded
- A valid JWT for the student (login flow or `scripts/dev-token.sh`)

## 1) curl smoke (single message)
```bash
LESSON_ID="<uuid of a lesson>"
JWT="<student access token>"
curl -N -X POST http://localhost:8080/api/v1/ai/tutor/stream \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d "{\"lesson_id\":\"$LESSON_ID\",\"message\":\"Apa rumus luas lingkaran?\"}"
```
Expected output (interleaved, near real-time):
```
event: start
data: {"session_id":"..."}

event: token
data: {"token":"Luas"}

event: token
data: {"token":" lingkaran"}
...
event: done
data: {"status":"complete","session_id":"..."}
```
Failure modes:
- 401 → JWT invalid or expired
- 429 → quota (50/hr) exceeded; clear `ai_quota_usage` rows for the user during dev
- 502/upstream error → check `GROQ_API_KEY`, network egress to api.groq.com

## 2) Verify session persistence
After the stream completes, query Postgres:
```sql
SELECT id, message_count, last_message_at
FROM ai_tutor_sessions
WHERE user_id = '<student id>' AND lesson_id = '<lesson id>'
ORDER BY last_message_at DESC LIMIT 1;
```
`messages_json` should contain user + assistant turns; `message_count` should be incremented by 2.

## 3) Verify quota enforcement
Play 50 queries in an hour. The 51st should return:
```json
{ "error": { "code": "rate_limited", "message": "..." } }
```

## 4) FE integration (useAiStream)
Load a lesson page, send a message, watch tokens append in real-time. Network tab should show the
request with `text/event-stream` content type and incremental data frames.

## Sign-off
Mark this issue closed only when steps 1–4 all pass against staging.
