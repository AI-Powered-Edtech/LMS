/**
 * useSignOut — Centralized sign-out handler.
 *
 * Ensures consistent behavior across all sign-out buttons:
 *  1. Calls auth.signOut() (which clears session)
 *  2. Navigates to /login on success or error
 *  3. Captures unexpected errors to Sentry
 *
 * Usage:
 *   const handleSignOut = useSignOut()
 *   <button onClick={handleSignOut}>Keluar</button>
 *
 * The returned function is async — callers should use `void handleSignOut()`
 * to preserve the "fire-and-forget" semantics of the original onClick handlers.
 */

import { useNavigate } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/utils/logger";
import { captureError } from "@/utils/sentry";

export function useSignOut(): () => Promise<void> {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  return async () => {
    try {
      await signOut();
    } catch (err) {
      if (import.meta.env.DEV) logger.error("[useSignOut] signOut error:", err);
      captureError(err, { context: "useSignOut" });
    } finally {
      void navigate("/login");
    }
  };
}
