-- 046_rbac_10_role_matrix.sql
-- Fase 1 Unit 19: 10-role RBAC matrix
--
-- Existing app_role enum: STUDENT, TEACHER, ADMIN, PARENT, PRINCIPAL.
-- Add: WALI_KELAS, WAKASEK, GURU_BK, TU, YAYASAN, PENGAWAS.
--
-- The text-based public.tenant_memberships.role column already accepts
-- arbitrary role strings; this migration extends the strict enum so
-- public.user_roles (used by `set_user_role` RPC and downstream RLS-style
-- checks in handlers) can express the new roles too.
--
-- We also add a per-(role × module × action) capability table so the FE
-- can drive UI gating from data rather than hard-coded role strings.

DO $$ BEGIN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'WALI_KELAS';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'WAKASEK';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'GURU_BK';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'TU';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'YAYASAN';
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'PENGAWAS';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'app_role enum extension partially failed (likely already extended): %', SQLERRM;
END $$;

CREATE TABLE IF NOT EXISTS public.role_capabilities (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    role        TEXT         NOT NULL,                         -- text mirror of app_role for portability
    module      TEXT         NOT NULL,                         -- 'gradebook', 'finance', 'rombel', ...
    action      TEXT         NOT NULL,                         -- 'view', 'edit', 'delete', 'export'
    scope       TEXT         NOT NULL DEFAULT 'tenant'         -- 'tenant', 'rombel', 'self', 'foundation'
                              CHECK (scope IN ('tenant', 'rombel', 'self', 'foundation')),
    is_granted  BOOLEAN      NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

    UNIQUE (role, module, action)
);

CREATE INDEX IF NOT EXISTS idx_role_capabilities_role ON public.role_capabilities(role);

-- Seed canonical 10-role × module × action grid. Idempotent via ON CONFLICT.
-- This is the FE source of truth for UI gating; backend should also
-- enforce these (via middleware) — Fase 1 ships data only, enforcement
-- middleware is Fase 1 Unit 19 follow-up (operator gate).
INSERT INTO public.role_capabilities (role, module, action, scope, is_granted)
VALUES
    -- STUDENT
    ('STUDENT', 'courses',       'view',   'self',       true),
    ('STUDENT', 'gradebook',     'view',   'self',       true),
    ('STUDENT', 'attendance',    'view',   'self',       true),
    ('STUDENT', 'forum',         'view',   'tenant',     true),
    ('STUDENT', 'forum',         'post',   'tenant',     true),

    -- PARENT
    ('PARENT', 'children',        'view',   'self',      true),
    ('PARENT', 'invoices',        'view',   'self',      true),
    ('PARENT', 'invoices',        'pay',    'self',      true),
    ('PARENT', 'announcements',   'view',   'tenant',    true),

    -- TEACHER (guru mapel)
    ('TEACHER', 'courses',        'edit',   'self',      true),
    ('TEACHER', 'lessons',        'edit',   'self',      true),
    ('TEACHER', 'gradebook',      'edit',   'rombel',    true),
    ('TEACHER', 'assignments',    'grade',  'rombel',    true),
    ('TEACHER', 'attendance',     'edit',   'rombel',    true),

    -- WALI_KELAS (superset of TEACHER for own rombel)
    ('WALI_KELAS', 'rombel',         'view',   'self',   true),
    ('WALI_KELAS', 'gradebook',      'view',   'rombel', true),
    ('WALI_KELAS', 'attendance',     'view',   'rombel', true),
    ('WALI_KELAS', 'student_dossier','edit',   'rombel', true),
    ('WALI_KELAS', 'rapor',          'sign',   'rombel', true),
    ('WALI_KELAS', 'parent_messages','send',   'rombel', true),

    -- GURU_BK
    ('GURU_BK', 'student_dossier',   'view',   'tenant', true),
    ('GURU_BK', 'counseling_notes',  'edit',   'tenant', true),
    ('GURU_BK', 'attendance',        'view',   'tenant', true),

    -- WAKASEK (kurikulum/kesiswaan/etc — distinguished by tenant_memberships.role text)
    ('WAKASEK', 'rombel',         'edit',   'tenant',    true),
    ('WAKASEK', 'timetable',      'edit',   'tenant',    true),
    ('WAKASEK', 'curriculum',     'edit',   'tenant',    true),
    ('WAKASEK', 'analytics',      'view',   'tenant',    true),

    -- TU (tata usaha)
    ('TU', 'invoices',            'edit',   'tenant',    true),
    ('TU', 'payments',            'view',   'tenant',    true),
    ('TU', 'documents',           'edit',   'tenant',    true),
    ('TU', 'ppdb',                'edit',   'tenant',    true),
    ('TU', 'student_dossier',     'edit',   'tenant',    true),
    ('TU', 'staff_dossier',       'view',   'tenant',    true),

    -- PRINCIPAL
    ('PRINCIPAL', 'analytics',    'view',   'tenant',    true),
    ('PRINCIPAL', 'finance',      'view',   'tenant',    true),
    ('PRINCIPAL', 'rapor',        'sign',   'tenant',    true),
    ('PRINCIPAL', 'staff_dossier','view',   'tenant',    true),

    -- ADMIN (system admin, super-user within tenant)
    ('ADMIN', 'tenant_settings',  'edit',   'tenant',    true),
    ('ADMIN', 'users',            'edit',   'tenant',    true),
    ('ADMIN', 'feature_flags',    'edit',   'tenant',    true),

    -- YAYASAN (foundation: read-only across all child tenants)
    ('YAYASAN', 'analytics',      'view',   'foundation', true),
    ('YAYASAN', 'finance',        'view',   'foundation', true),

    -- PENGAWAS (dinas pendidikan: read-only across negeri tenants)
    ('PENGAWAS', 'analytics',     'view',   'foundation', true),
    ('PENGAWAS', 'school_baseline_metrics', 'view', 'foundation', true)
ON CONFLICT (role, module, action) DO UPDATE SET
    scope = EXCLUDED.scope,
    is_granted = EXCLUDED.is_granted;
