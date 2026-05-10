import { type ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { type Role, useAuth } from "../../contexts/AuthContext";
import { AppLoading } from "../layout/AppLoading";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { activeRole, loading } = useAuth();
  const location = useLocation();

  // SECURITY: Only use activeRole (per-tenant role). Never fall back to global role.
  // Global role is the highest privilege across ALL tenants and can cause
  // cross-tenant privilege escalation if used for authorization.
  // During initial load, TenantGuard will already have redirected if no tenant selected.
  const hasAccess =
    !loading && activeRole !== null && allowedRoles.includes(activeRole);

  // WCAG SC 2.4.3 — Focus Order: When access is denied and the user is redirected
  // to /unauthorized, move keyboard focus to the main landmark so screen reader
  // users hear the page title instead of being left on a stale focus target.
  useEffect(() => {
    if (!loading && !hasAccess) {
      const main = document.getElementById("main-content");
      if (main) {
        main.focus();
      }
    }
  }, [loading, hasAccess]);

  if (loading) {
    return <AppLoading />;
  }

  if (!hasAccess) {
    // Preserve the attempted location and the user's actual role so the
    // /unauthorized page can offer a "Go to my dashboard" action.
    return (
      <Navigate
        to="/unauthorized"
        state={{ from: location, userRole: activeRole }}
        replace
      />
    );
  }

  return <>{children}</>;
}
