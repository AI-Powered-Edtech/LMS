import { ReactNode } from "react";
import { ProtectedRoute } from "./ProtectedRoute";
import { Role } from "../contexts/AuthContext";

interface RoleRouteProps {
    children: ReactNode;
    role: Role | Role[];
}

export function RoleRoute({ children, role }: RoleRouteProps) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    return <ProtectedRoute allowedRoles={allowedRoles}>{children}</ProtectedRoute>;
}
