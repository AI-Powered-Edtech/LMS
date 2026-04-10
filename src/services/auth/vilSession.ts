import type { AuthSession } from './types'

export const VIL_SESSION_STORAGE_KEY = 'vil_auth_session'
const RECOVERY_TOKEN_STORAGE_KEY = 'vil_recovery_token'

type SessionListener = (event: string, session: AuthSession | null) => void

const listeners = new Set<SessionListener>()

export function readVilSession(): AuthSession | null {
  if (typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(VIL_SESSION_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthSession
  } catch {
    return null
  }
}

export function writeVilSession(session: AuthSession): void {
  if (typeof window === 'undefined') return

  window.sessionStorage.setItem(VIL_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearVilSession(): void {
  if (typeof window === 'undefined') return

  window.sessionStorage.removeItem(VIL_SESSION_STORAGE_KEY)
}

export function subscribeVilSession(listener: SessionListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emitVilSession(event: string, session: AuthSession | null): void {
  listeners.forEach((listener) => listener(event, session))
}

export function readRecoveryToken(): string | null {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(RECOVERY_TOKEN_STORAGE_KEY)
}

export function writeRecoveryToken(token: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(RECOVERY_TOKEN_STORAGE_KEY, token)
}

export function clearRecoveryToken(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(RECOVERY_TOKEN_STORAGE_KEY)
}
