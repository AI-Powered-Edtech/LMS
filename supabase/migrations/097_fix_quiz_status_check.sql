-- =============================================
-- Fix: Add 'expired' to quiz_attempts_v2 status CHECK constraint
-- Context: Migration 095 introduced 'expired' status but CHECK only had
-- 'in_progress', 'submitted', 'graded', 'abandoned'
-- Must handle partitioned table + all partitions
-- =============================================

-- 1. Drop old constraint on parent
ALTER TABLE public.quiz_attempts_v2
DROP CONSTRAINT IF EXISTS quiz_attempts_v2_status_check;

-- 2. Add new constraint with 'expired'
ALTER TABLE public.quiz_attempts_v2
ADD CONSTRAINT quiz_attempts_v2_status_check
CHECK (status IN ('in_progress', 'submitted', 'graded', 'abandoned', 'expired'));

-- 3. Drop partition-level constraints (they may have their own copies)
DO $$
DECLARE
partition_name TEXT;
constraint_name TEXT;
BEGIN
FOR partition_name IN
SELECT inhrelid::regclass::text
FROM pg_inherits
WHERE inhparent = 'public.quiz_attempts_v2'::regclass
LOOP
constraint_name := replace(replace(partition_name, 'public.', ''), '"', '') || '_status_check';
EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I',
partition_name, constraint_name);
RAISE NOTICE 'Cleaned constraint on partition: %', partition_name;
END LOOP;
END $$;
