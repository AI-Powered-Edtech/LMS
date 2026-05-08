-- 076: One-shot invalidation of all refresh_tokens, executed after JWT key rotation.
--
-- Operator note: run this migration ONLY in coordination with the JWT key rotation
-- runbook in docs/handoff/JWT_KEY_ROTATION_2026-05-07.md. After this runs every user
-- must log in again to obtain a new refresh_token signed by the new key.
--
-- Idempotent: re-running has no further effect once rows are revoked.

UPDATE refresh_tokens
SET revoked_at = NOW()
WHERE revoked_at IS NULL;

-- Optional: log how many rows were affected for the operator audit trail.
DO $$
DECLARE
    cnt INT;
BEGIN
    SELECT count(*) INTO cnt FROM refresh_tokens WHERE revoked_at IS NOT NULL;
    RAISE NOTICE 'refresh_tokens revoked count after migration 076: %', cnt;
END $$;
