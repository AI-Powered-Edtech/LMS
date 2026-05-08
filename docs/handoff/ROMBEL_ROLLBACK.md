# Rombel cutover rollback runbook

If rombel-first reads regress in production, rollback is a single FE env flag flip + redeploy.

## Symptoms warranting rollback
- Empty class lists where students should appear (rombel join misconfigured)
- 4xx/5xx spikes on `/data/rombels`, `/data/rombel_members`
- User reports of missing students or wrong section assignments

## Procedure
1. **Flip the flag** in production FE env:
   ```
   VITE_USE_ROMBEL_ADAPTER=false
   ```
   This causes `classSectionAdapter.ts::isRombelAdapterEnabled()` to return `false`,
   routing all reads through the legacy `classes`-only path.
2. **Redeploy** the frontend (Vite build picks up env at build time, so a fresh build is required).
3. **Verify rollback** in browser:
   - Open a class list page; students should populate via the legacy `enrollments` join.
   - DevTools Network tab should show queries to `classes` / `enrollments`, not `rombels` / `rombel_members`.

## Verification queries (operator)
Run against production read-replica to compare counts:
```sql
-- Expected non-zero in either source for any active section
SELECT count(*) FROM rombel_members WHERE rombel_id = '<rombel_id>';
SELECT count(*) FROM enrollments  WHERE class_id  = '<class_id>';
```
If rombel side returns 0 but enrollments returns N > 0, that confirms the rombel join is the regression— rollback is justified.

## Recovery plan after rollback
- File a follow-up issue under label `frontend` with the diagnostic output.
- Triage: data drift (rombel sync stalled?) vs FE bug (adapter dispatch wrong source).
- Fix-forward via PR; do NOT merge another rombel-related change until the regression is reproduced and fixed in a test.

## Re-enable after fix
1. Set `VITE_USE_ROMBEL_ADAPTER=true` in prod FE env.
2. Redeploy.
3. Smoke test rombel paths (Playwright F1 in repo) before announcing.
