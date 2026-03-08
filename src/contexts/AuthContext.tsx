import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export type Role = 'teacher' | 'student' | 'admin';

export interface Permissions {
  canCreateCourse: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canTakeExams: boolean;
  canScheduleExams: boolean;
}

export const rolePermissions: Record<Role, Permissions> = {
  student: {
    canCreateCourse: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canTakeExams: true,
    canScheduleExams: false,
  },
  teacher: {
    canCreateCourse: true,
    canManageUsers: false,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: true,
  },
  admin: {
    canCreateCourse: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canTakeExams: false,
    canScheduleExams: true,
  },
};

interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  tenant_id: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  tenantId: string | null;
  roles: Role[];
  role: Role; // primary role (highest privilege)
  permissions: Permissions;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, firstName: string, lastName: string, tenantId?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  hasRole: (role: Role) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getPrimaryRole(roles: Role[]): Role {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('teacher')) return 'teacher';
  return 'student';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (userId: string) => {
    // Fetch profile
    console.log('[fetchUserData] Fetching profile for', userId);
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, avatar_url, tenant_id')
      .eq('id', userId)
      .single();

    console.log('[fetchUserData] Profile fetch result:', { profileData, profileErr });

    if (profileData) {
      setProfile(profileData);
      setTenantId(profileData.tenant_id);
    }

    // Fetch roles
    console.log('[fetchUserData] Fetching roles for', userId);
    const { data: rolesData, error: rolesErr } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    console.log('[fetchUserData] Roles fetch result:', { rolesData, rolesErr });

    if (rolesData) {
      const userRoles = rolesData.map((r: { role: string }) => r.role.toLowerCase() as Role);
      setRoles(userRoles);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      console.log('[AuthContext] getSession resolved');
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        console.log('[AuthContext] getSession user found, calling fetchUserData');
        fetchUserData(s.user.id).finally(() => {
          console.log('[AuthContext] getSession fetchUserData finally, setting loading=false');
          setLoading(false);
        });
      } else {
        console.log('[AuthContext] getSession no user, setting loading=false');
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        console.log('[AuthContext] onAuthStateChange event:', _event);
        setSession(s);
        setUser(s?.user ?? null);
        if (s?.user) {
          console.log('[AuthContext] onAuthStateChange user found, calling fetchUserData');
          fetchUserData(s.user.id)
            .then(() => {
              console.log('[AuthContext] onAuthStateChange fetchUserData completed');
              setLoading(false);
            })
            .catch(err => {
              console.error('[AuthContext] onAuthStateChange fetch error:', err);
              setLoading(false);
            });
        } else {
          setProfile(null);
          setTenantId(null);
          setRoles([]);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, signUpTenantId?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          ...(signUpTenantId ? { tenant_id: signUpTenantId } : {}),
        },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTenantId(null);
    setRoles([]);
  };

  const hasRole = (r: Role) => roles.includes(r);

  const role = getPrimaryRole(roles);
  const permissions = rolePermissions[role];

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tenantId,
        roles,
        role,
        permissions,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
