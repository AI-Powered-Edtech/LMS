import '@testing-library/jest-dom'

import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { vi } from 'vitest'

import { type AuthProvider, setAuthProvider } from '@/services/auth'

try {
  mkdirSync(join(process.cwd(), 'coverage', '.tmp'), { recursive: true })
} catch {}

const testAuthProvider: AuthProvider = {
  getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  getUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  getAuthBootstrap: vi.fn(async () => ({ data: null, error: null })),
  onAuthStateChange: vi.fn(() => ({
    data: {
      subscription: {
        unsubscribe: vi.fn(),
      },
    },
  })),
  switchTenant: vi.fn(async () => ({ data: { session: null }, error: null })),
  signInWithPassword: vi.fn(async () => ({ data: { session: null, user: null }, error: null })),
  signUp: vi.fn(async () => ({ data: { session: null, user: null }, error: null })),
  signInWithOAuth: vi.fn(async () => ({ error: null })),
  signOut: vi.fn(async () => ({ error: null })),
  refreshSession: vi.fn(async () => ({ data: { session: null }, error: null })),
  exchangeCodeForSession: vi.fn(async () => ({
    data: { session: null, user: null },
    error: null,
  })),
  verifyOtp: vi.fn(async () => ({ error: null })),
  resend: vi.fn(async () => ({ error: null })),
  resetPasswordForEmail: vi.fn(async () => ({ error: null })),
  updateUser: vi.fn(async () => ({ data: { user: null }, error: null })),
  mfa: {
    enroll: vi.fn(async () => ({ data: null, error: null })),
    challenge: vi.fn(async ({ factorId }: { factorId: string }) => ({
      data: { id: factorId, expires_at: Date.now() + 60_000 },
      error: null,
    })),
    verify: vi.fn(async () => ({ data: { valid: true }, error: null })),
    challengeAndVerify: vi.fn(async () => ({ data: { valid: true }, error: null })),
    unenroll: vi.fn(async () => ({ error: null })),
    listFactors: vi.fn(async () => ({ data: { all: [] }, error: null })),
    getAuthenticatorAssuranceLevel: vi.fn(async () => ({
      data: { currentLevel: 'aal1', nextLevel: null, canVerifySingleFactor: true },
      error: null,
    })),
  },
}

setAuthProvider(testAuthProvider)
