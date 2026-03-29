-- Fix permissive RLS policy for admin_audit_logs
-- Enforces that users can only insert audit logs for their own tenant
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON "public"."admin_audit_logs";

CREATE POLICY "Enable insert for authenticated users" ON "public"."admin_audit_logs"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND tenant_id = (SELECT public.get_my_tenant_id())
);
