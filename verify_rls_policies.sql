-- verify_rls_policies.sql
-- Test user_roles and profiles isolation with valid UUIDs
BEGIN;

-- Use valid UUIDs
-- tenant_id: 00000000-0000-0000-0000-000000000001
-- student_id: 11111111-1111-1111-1111-111111111111

-- 1. Test student access
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET LOCAL request.jwt.claim.tenant_id = '00000000-0000-0000-0000-000000000001';
SET LOCAL request.jwt.claim.role = 'AUTHENTICATED';

-- Should see only their own roles
SELECT 'STUDENT_ROLES_CHECK' as test, count(*) FROM public.user_roles;

-- 2. Test admin access within tenant
SET LOCAL request.jwt.claim.role = 'ADMIN';
-- Should see all roles in tenant-1
SELECT 'ADMIN_ROLES_CHECK' as test, count(*) FROM public.user_roles WHERE tenant_id = '00000000-0000-0000-0000-000000000001';

-- 3. Test cross-tenant block
-- Attempt to see tenant-2 roles (should return 0)
SELECT 'CROSS_TENANT_BLOCK_CHECK' as test, count(*) FROM public.user_roles WHERE tenant_id = '00000000-0000-0000-0000-000000000002';

-- 4. Test profile access
SELECT 'PROFILE_ISOLATION_CHECK' as test, count(*) FROM public.profiles;

ROLLBACK;
