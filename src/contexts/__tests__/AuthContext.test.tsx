import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'

// ---------------------------------------------------------------------------
// vi.hoisted creates variables that are available in the vi.mock factory.
// We use a mutable container so the callback can be captured after mock setup.
// ---------------------------------------------------------------------------
const { authCbContainer, mockUnsubscribe } = vi.hoisted(() => {
  const authCbContainer: { cb: ((event: string, session: unknown) => void) | null } = { cb: null }
  const mockUnsubscribe = vi.fn()
  return { authCbContainer, mockUnsubscribe }
})

vi.mock('@/src/services/supabase/client', () => {
  const mockSupabase = {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn((cb: (event: string, session: unknown) => void) => {
        authCbContainer.cb = cb
        return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      signInWithOAuth: vi.fn(),
      refreshSession: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
  }
  return { supabase: mockSupabase }
})

// Import after vi.mock so it picks up the mocked module
import { AuthProvider, useAuth } from '../AuthContext'
import { supabase } from '@/src/services/supabase/client'

// Cast to access mock helpers
const mockAuth = supabase.auth as unknown as {
  getSession: ReturnType<typeof vi.fn>
  onAuthStateChange: ReturnType<typeof vi.fn>
  signOut: ReturnType<typeof vi.fn>
}
const mockFrom = supabase.from as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_USER = {
  id: 'user-abc-123',
  email: 'teacher@edusync.dev',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2026-01-01T00:00:00Z',
}

const MOCK_SESSION = {
  user: MOCK_USER,
  access_token: 'tok-abc',
  refresh_token: 'ref-abc',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
}

const MOCK_PROFILE = {
  id: 'user-abc-123',
  email: 'teacher@edusync.dev',
  first_name: 'Budi',
  last_name: 'Santoso',
  avatar_url: null,
  tenant_id: 'tenant-xyz',
}

const MOCK_ROLES_DATA = [
  {
    role: 'teacher',
    tenant_id: 'tenant-xyz',
    tenants: { id: 'tenant-xyz', name: 'SMA Maju', slug: 'sma-maju', is_active: true },
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFromMock(profileData: unknown, rolesData: unknown) {
  return vi.fn().mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: profileData, error: null }),
      }
    }
    if (table === 'user_roles') {
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: rolesData, error: null }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
  })
}

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authCbContainer.cb = null
    localStorage.clear()

    // Re-register implementations cleared by vi.clearAllMocks()
    mockAuth.getSession.mockResolvedValue({ data: { session: null } })
    mockAuth.onAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authCbContainer.cb = cb
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })
    mockFrom.mockImplementation(buildFromMock(null, []))
  })

  afterEach(() => {
    localStorage.clear()
  })

  // D1-T1: Default state when no session exists
  it('initialises with no user when getSession returns null', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.role).toBe('student') // default fallback
  })

  // D1-T2: User and profile populated from session
  it('populates user and profile when session exists', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } })
    mockFrom.mockImplementation(buildFromMock(MOCK_PROFILE, MOCK_ROLES_DATA))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.user?.id).toBe('user-abc-123')
    expect(result.current.profile?.first_name).toBe('Budi')
    expect(result.current.tenantId).toBe('tenant-xyz')
  })

  // D1-T3: Role resolves from user_roles table
  it('resolves role from user_roles data', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } })
    mockFrom.mockImplementation(buildFromMock(MOCK_PROFILE, MOCK_ROLES_DATA))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.role).toBe('teacher')
    expect(result.current.roles).toContain('teacher')
  })

  // D1-T4: Admin is highest-privilege role
  it('resolves admin as primary role when user has admin + teacher', async () => {
    const multiRoleData = [
      {
        role: 'admin',
        tenant_id: 'tenant-xyz',
        tenants: { id: 'tenant-xyz', name: 'SMA Maju', slug: 'sma-maju', is_active: true },
      },
      {
        role: 'teacher',
        tenant_id: 'tenant-xyz',
        tenants: { id: 'tenant-xyz', name: 'SMA Maju', slug: 'sma-maju', is_active: true },
      },
    ]

    mockAuth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } })
    mockFrom.mockImplementation(buildFromMock(MOCK_PROFILE, multiRoleData))

    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.role).toBe('admin')
  })

  // D1-T5: Sign out clears state eagerly
  it('clears user, profile and roles on signOut', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } })
    mockFrom.mockImplementation(buildFromMock(MOCK_PROFILE, MOCK_ROLES_DATA))
    mockAuth.signOut.mockResolvedValue({})

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    await act(async () => {
      await result.current.signOut()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.profile).toBeNull()
    expect(result.current.roles).toHaveLength(0)
  })

  // D1-T6: sessionExpired set when SIGNED_OUT fires after being authenticated
  it('sets sessionExpired when SIGNED_OUT event fires after prior authentication', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } })
    mockFrom.mockImplementation(buildFromMock(MOCK_PROFILE, MOCK_ROLES_DATA))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Simulate supabase firing SIGNED_OUT after user was authenticated
    await act(async () => {
      authCbContainer.cb!('SIGNED_OUT', null)
    })

    expect(result.current.sessionExpired).toBe(true)
  })

  // D1-T7: hasRole returns correct boolean
  it('hasRole returns true for matching role and false otherwise', async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: MOCK_SESSION } })
    mockFrom.mockImplementation(buildFromMock(MOCK_PROFILE, MOCK_ROLES_DATA))

    const { result } = renderHook(() => useAuth(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.hasRole('teacher')).toBe(true)
    expect(result.current.hasRole('admin')).toBe(false)
    expect(result.current.hasRole('student')).toBe(false)
  })

  // D1-T8: Unsubscribes from auth listener on unmount
  it('unsubscribes from auth state change on unmount', async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(mockUnsubscribe).toBeDefined())

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})
