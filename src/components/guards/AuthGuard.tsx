import React, { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'
import { AppLoading } from '../layout/AppLoading'

interface AuthGuardProps {
  children: ReactNode
  /**
   * When true (default), redirects to /verify-email if the user's email
   * has not been confirmed. Set to false only for pages that should be
   * accessible before email confirmation (e.g. the verify-email page itself,
   * or a post-registration "check your inbox" screen).
   */
  requireEmailVerification?: boolean
}

/**
 * AuthGuard — Layer 1 of the 3-layer guard chain:
 *
 *   AuthGuard → TenantGuard → RoleGuard
 *
 * Responsibilities:
 *   1. Show a loading screen while the auth state is being resolved.
 *   2. Redirect unauthenticated visitors to /login (preserving the intended
 *      destination in location.state.from so Login can redirect back).
 *   3. Redirect authenticated users whose email is not yet confirmed to
 *      /verify-email (unless requireEmailVerification is explicitly false).
 *
 * This guard intentionally does NOT check tenant or role — those concerns
 * belong to TenantGuard and RoleGuard respectively.
 *
 * NOTE: This is the ONLY place email verification is enforced.
 */
export function AuthGuard({ children, requireEmailVerification = true }: AuthGuardProps) {
  const { session, user, loading, emailVerified } = useAuth()
  const location = useLocation()

  // ── 1. Loading ─────────────────────────────────────────────────────────────
  // Show a full-screen loading indicator while API resolves the session
  // and fetches the user profile + memberships.
  if (loading) {
    return <AppLoading />
  }

  // ── 2. Unauthenticated ─────────────────────────────────────────────────────
  // No active session → send to login page.
  // Preserve the current path in state.from so Login can redirect the user
  // back after they sign in.
  if (!session || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // ── 3. Email not verified ──────────────────────────────────────────────────
  // The user is authenticated but has not yet confirmed their email address.
  // Block access to the app and direct them to the verification page.
  //
  // Skip this check when requireEmailVerification is false (used by the
  // /verify-email route itself to prevent an infinite redirect loop).
  if (requireEmailVerification && !emailVerified) {
    return <Navigate to="/verify-email" state={{ from: location }} replace />
  }

  // ── 4. Authenticated & verified ───────────────────────────────────────────
  return <>{children}</>
}
