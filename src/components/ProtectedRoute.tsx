import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth, Role } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Role[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  // All hooks MUST be called before any early return (React Rules of Hooks)
  useEffect(() => {
    if (import.meta.env.DEV && user && allowedRoles.includes(role)) {
      console.log(`[Render] Allowed access for role ${role} (Allowed: ${allowedRoles}). Render children.`);
    }
  }, [user, role, allowedRoles]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div className="text-xl font-bold text-slate-500">LOADING AUTH...</div>
      </div>
    );
  }

  // Not logged in → login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but wrong role
  if (!allowedRoles.includes(role)) {
    // Smart fallback to prevent infinite redirect loops
    let redirectPath = "/";
    if (role === 'admin') redirectPath = "/admin-hub";
    else if (role === 'teacher') redirectPath = "/teacher-dashboard";
    else if (role === 'student') redirectPath = "/";

    if (import.meta.env.DEV) {
      console.log(`[Redirect] Role ${role} trying to access restricted route (Allowed: ${allowedRoles}). Redirecting to ${redirectPath}. User:`, user?.id);
    }
    return <Navigate to={redirectPath} replace />;
  }

  return <>{children}</>;
}
