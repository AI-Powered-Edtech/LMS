-- 068_sync_user_roles_to_granular.sql
-- U07.1 per ADR-001: user_roles = authoritative. Sync granular roles from
-- tenant_memberships.role text into user_roles.role enum. Enables RBAC
-- policy (rbac_policy.yaml) to differentiate wali_kelas vs teacher, etc.
--
-- Idempotent: uses INSERT ... ON CONFLICT DO UPDATE.

BEGIN;

-- For each (user_id, tenant_id) in tenant_memberships, ensure user_roles has
-- a matching row with the granular role. Mapping text -> app_role:
--   teacher            -> TEACHER
--   student            -> STUDENT
--   parent             -> PARENT
--   admin              -> ADMIN
--   principal          -> PRINCIPAL
--   wali_kelas         -> WALI_KELAS
--   wakasek_kurikulum  -> WAKASEK       (granular split by string match, stored as WAKASEK)
--   wakasek_kesiswaan  -> WAKASEK
--   wakasek_sarpras    -> WAKASEK
--   wakasek_humas      -> WAKASEK
--   guru_bk            -> GURU_BK
--   tu                 -> TU
--   yayasan            -> YAYASAN
--   pengawas           -> PENGAWAS

INSERT INTO public.user_roles (user_id, tenant_id, role)
SELECT tm.user_id, tm.tenant_id,
  CASE
    WHEN UPPER(tm.role) LIKE 'WAKASEK%'                 THEN 'WAKASEK'::public.app_role
    WHEN UPPER(tm.role) = 'WALI_KELAS'                  THEN 'WALI_KELAS'::public.app_role
    WHEN UPPER(tm.role) = 'GURU_BK'                     THEN 'GURU_BK'::public.app_role
    WHEN UPPER(tm.role) = 'TU'                          THEN 'TU'::public.app_role
    WHEN UPPER(tm.role) = 'YAYASAN'                     THEN 'YAYASAN'::public.app_role
    WHEN UPPER(tm.role) = 'PENGAWAS'                    THEN 'PENGAWAS'::public.app_role
    WHEN UPPER(tm.role) = 'PRINCIPAL'                   THEN 'PRINCIPAL'::public.app_role
    WHEN UPPER(tm.role) = 'PARENT'                      THEN 'PARENT'::public.app_role
    WHEN UPPER(tm.role) = 'TEACHER'                     THEN 'TEACHER'::public.app_role
    WHEN UPPER(tm.role) = 'STUDENT'                     THEN 'STUDENT'::public.app_role
    WHEN UPPER(tm.role) = 'ADMIN'                       THEN 'ADMIN'::public.app_role
    ELSE NULL
  END AS role
FROM public.tenant_memberships tm
WHERE tm.status = 'active'
  AND CASE
        WHEN UPPER(tm.role) LIKE 'WAKASEK%'     THEN TRUE
        WHEN UPPER(tm.role) IN (
          'WALI_KELAS','GURU_BK','TU','YAYASAN','PENGAWAS',
          'PRINCIPAL','PARENT','TEACHER','STUDENT','ADMIN'
        ) THEN TRUE
        ELSE FALSE
      END
ON CONFLICT (user_id, role, tenant_id) DO NOTHING;

-- Optional cleanup: delete coarse TEACHER rows for users who now have a more
-- specific role like WALI_KELAS / GURU_BK. Policy file treats each role as
-- additive so this is cosmetic; skipped to keep migration purely additive.

COMMIT;
