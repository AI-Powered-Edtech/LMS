-- =============================================================================
-- QUIZ V1/V2 SCHEMA FRAGMENTATION DIAGNOSTIC QUERIES
-- =============================================================================
-- Run these queries in Supabase SQL Editor to diagnose quiz schema issues
-- =============================================================================

-- =============================================================================
-- 1. CHECK IF LEGACY TABLE STILL HAS DATA (CRITICAL)
-- =============================================================================
SELECT 
    'quiz_attempts_legacy' AS table_name,
    COUNT(*) AS row_count,
    COUNT(DISTINCT student_id) AS unique_students,
    COUNT(DISTINCT quiz_id) AS unique_quizzes,
    MIN(created_at) AS earliest_record,
    MAX(created_at) AS latest_record
FROM public.quiz_attempts_legacy

UNION ALL

SELECT 
    'quiz_attempts_v2' AS table_name,
    COUNT(*) AS row_count,
    COUNT(DISTINCT student_id) AS unique_students,
    COUNT(DISTINCT quiz_id) AS unique_quizzes,
    MIN(started_at) AS earliest_record,
    MAX(started_at) AS latest_record
FROM public.quiz_attempts_v2;

-- =============================================================================
-- 2. CHECK COLUMN MISMATCHES BETWEEN V2 TABLE AND VIEW (CRITICAL)
-- =============================================================================
-- Columns in quiz_attempts_v2
SELECT 
    'quiz_attempts_v2' AS source,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quiz_attempts_v2'
  AND table_schema = 'public'

EXCEPT

-- Columns exposed by quiz_attempts VIEW (should be same as V2)
SELECT 
    'quiz_attempts_view' AS source,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'quiz_attempts'
  AND table_schema = 'public'
  AND table_type = 'VIEW';

-- =============================================================================
-- 3. CHECK IF LEGACY TABLE HAS COLUMNS NOT IN V2
-- =============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'quiz_attempts_legacy'
  AND table_schema = 'public'

EXCEPT

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'quiz_attempts_v2'
  AND table_schema = 'public';

-- =============================================================================
-- 4. CHECK ASSIGNMENT_ID COLUMN STATUS (Added in migration 81/82)
-- =============================================================================
-- Check if assignment_id exists in V2 table
SELECT 
    'quiz_attempts_v2 has assignment_id' AS check_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_attempts_v2' 
        AND column_name = 'assignment_id'
    ) AS result

UNION ALL

-- Check if assignment_id exists in legacy table
SELECT 
    'quiz_attempts_legacy has assignment_id' AS check_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_attempts_legacy' 
        AND column_name = 'assignment_id'
    ) AS result

UNION ALL

-- Check if VIEW exposes assignment_id
SELECT 
    'quiz_attempts VIEW has assignment_id' AS check_name,
    EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'quiz_attempts' 
        AND column_name = 'assignment_id'
    ) AS result;

-- =============================================================================
-- 5. CHECK FOR ORPHANED DATA IN quiz_answers (Foreign Key issues)
-- =============================================================================
SELECT 
    'Orphaned quiz_answers (no matching attempt in V2)' AS issue_type,
    COUNT(*) AS count
FROM public.quiz_answers qa
WHERE NOT EXISTS (
    SELECT 1 FROM public.quiz_attempts_v2 qav2 
    WHERE qav2.id = qa.attempt_id
)
AND NOT EXISTS (
    SELECT 1 FROM public.quiz_attempts_legacy ql 
    WHERE ql.id = qa.attempt_id
);

-- =============================================================================
-- 6. CHECK RPC FUNCTIONS POINTING TO WRONG TABLE
-- =============================================================================
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name LIKE '%quiz_attempt%'
  AND routine_schema = 'public';

-- =============================================================================
-- 7. CHECK RLS POLICIES ON BOTH TABLES
-- =============================================================================
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename IN ('quiz_attempts', 'quiz_attempts_v2', 'quiz_attempts_legacy')
ORDER BY tablename, policyname;

-- =============================================================================
-- 8. CHECK PARTITION STATUS FOR V2
-- =============================================================================
SELECT 
    schemaname,
    tablename,
    partitionname,
    partitionordinal,
    partitionstrategy,
    partitions
FROM pg_tables
WHERE tablename LIKE 'quiz_attempts_v2%'
ORDER BY tablename;

-- =============================================================================
-- 9. SAMPLE DATA FROM BOTH TABLES (Sanity Check)
-- =============================================================================
-- Sample from legacy
SELECT id, quiz_id, student_id, status, created_at
FROM public.quiz_attempts_legacy
LIMIT 5;

-- Sample from V2
SELECT id, quiz_id, student_id, status, started_at
FROM public.quiz_attempts_v2
LIMIT 5;

-- =============================================================================
-- 10. CHECK IF ANY STUDENTS HAVE DATA IN BOTH TABLES
-- =============================================================================
SELECT 
    student_id,
    COUNT(DISTINCT quiz_id) AS quiz_count,
    SUM(CASE WHEN source = 'legacy' THEN 1 ELSE 0 END) AS legacy_attempts,
    SUM(CASE WHEN source = 'v2' THEN 1 ELSE 0 END) AS v2_attempts
FROM (
    SELECT student_id, quiz_id, 'legacy' AS source
    FROM public.quiz_attempts_legacy
    UNION ALL
    SELECT student_id, quiz_id, 'v2' AS source
    FROM public.quiz_attempts_v2
) combined
GROUP BY student_id
HAVING COUNT(DISTINCT source) > 1
LIMIT 20;
