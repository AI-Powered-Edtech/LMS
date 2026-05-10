import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns a function that resolves a role-scoped path for navigation.
 *
 * SECURITY: Uses `activeRole` (per-tenant role), NOT the global `role`.
 * RoleGuard authorizes based on `activeRole`; using the global `role` here
 * can route a teacher-in-tenant to an admin-only path (because the global
 * role may be admin in a different tenant) and then get bounced to
 * /unauthorized by RoleGuard.
 */
export function useRoleBasedPath() {
  const { activeRole } = useAuth();

  return (teacherPath: string, adminPath: string, studentPath?: string) => {
    if (activeRole === "admin") return adminPath;
    if (activeRole === "student" && studentPath) return studentPath;
    return teacherPath;
  };
}
