import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Collaborator, SearchableUser } from '../api/builder/collaboratorService'
import { collaboratorService } from '../api/builder/collaboratorService'

// ============================================================
// Mock architecture
//
// The query builder is a chainable fluent interface.
// Each method returns `this` so `.select().eq().eq()` works.
//
// Strategy: the `from()` factory creates a fresh builder object
// per call. Every method on the builder records the call via a
// dedicated spy AND returns the same builder — so chaining never
// breaks. The FINAL method in the chain (the one that is
// `await`-ed) must return a Promise; we configure that with a
// per-test `resolvedValue` property on the builder.
//
// We capture the spy references in `vi.hoisted` so they're
// available for assertions in test bodies.
// ============================================================

const { spyFrom, spySelect, spyInsert, spyDelete, spyEq, spyIn, spyIlike, spyLimit } = vi.hoisted(() => ({
  spyFrom: vi.fn(),
  spySelect: vi.fn(),
  spyInsert: vi.fn(),
  spyDelete: vi.fn(),
  spyEq: vi.fn(),
  spyIn: vi.fn(),
  spyIlike: vi.fn(),
  spyLimit: vi.fn(),
}))

// Holds the value that the terminal method resolves with.
// Each test sets this before calling the service.
let terminalResult: unknown = { data: null, error: null }
let terminalResultByTable: Record<string, unknown> = {}

vi.mock('@/services/db', () => ({
  db: {
    from: (table: string) => {
      spyFrom(table)
      const resolveTerminal = () => terminalResultByTable[table] ?? terminalResult
      const builder: Record<string, any> = {
        select: (...args: unknown[]) => {
          spySelect(...args)
          return builder
        },
        insert: (...args: unknown[]) => {
          spyInsert(...args)
          return Promise.resolve(resolveTerminal())
        },
        delete: (...args: unknown[]) => {
          spyDelete(...args)
          return builder
        },
        eq: (...args: unknown[]) => {
          spyEq(...args)
          return builder
        },
        in: (...args: unknown[]) => {
          spyIn(...args)
          return Promise.resolve(resolveTerminal())
        },
        ilike: (...args: unknown[]) => {
          spyIlike(...args)
          return builder
        },
        limit: (...args: unknown[]) => {
          spyLimit(...args)
          return Promise.resolve(resolveTerminal())
        },
      }
      // fetchCollaborators and removeCollaborator terminate with the last `.eq()` call.
      // We override `eq` so the SECOND call returns the terminal Promise.
      let eqCallCount = 0
      builder.eq = (...args: unknown[]) => {
        spyEq(...args)
        eqCallCount++
        // For chains with exactly 2 `.eq()` calls (fetchCollaborators, removeCollaborator)
        // the second call is terminal.
        if (eqCallCount >= 2) return Promise.resolve(resolveTerminal())
        return builder
      }
      return builder
    },
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  terminalResult = { data: null, error: null }
  terminalResultByTable = {}
})

// ============================================================
// Test fixtures
// ============================================================

const TENANT_ID = 'tenant-abc'
const COURSE_ID = 'course-xyz'
const USER_ID = 'user-123'
const COLLABORATOR_ID = 'collab-456'

const rawCollaboratorRows = [
  {
    id: COLLABORATOR_ID,
    user_id: USER_ID,
    role: 'author',
    profiles: { full_name: 'Budi Santoso', email: 'budi@edusync.dev' },
  },
  {
    id: 'collab-789',
    user_id: 'user-456',
    role: 'reviewer',
    profiles: { full_name: 'Siti Rahayu', email: 'siti@edusync.dev' },
  },
]

const expectedCollaborators: Collaborator[] = [
  {
    id: COLLABORATOR_ID,
    user_id: USER_ID,
    role: 'author',
    profile: { full_name: 'Budi Santoso', email: 'budi@edusync.dev' },
  },
  {
    id: 'collab-789',
    user_id: 'user-456',
    role: 'reviewer',
    profile: { full_name: 'Siti Rahayu', email: 'siti@edusync.dev' },
  },
]

const rawProfileRows: SearchableUser[] = [
  { id: USER_ID, full_name: 'Budi Santoso', email: 'budi@edusync.dev' },
  { id: 'user-789', full_name: 'Budiman Hadi', email: 'budiman@edusync.dev' },
]

// ============================================================
// fetchCollaborators
// ============================================================

describe('collaboratorService.fetchCollaborators', () => {
  it('queries the course_collaborators table', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(spyFrom).toHaveBeenCalledWith('course_collaborators')
  })

  it('selects the correct columns including the profiles join', async () => {
    terminalResultByTable.course_collaborators = { data: [], error: null }
    terminalResultByTable.profiles = { data: [], error: null }
    await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(spySelect).toHaveBeenCalledTimes(2)

    const selectCollaboratorsArg: string = spySelect.mock.calls[0][0]
    expect(selectCollaboratorsArg).toMatch(/id/)
    expect(selectCollaboratorsArg).toMatch(/user_id/)
    expect(selectCollaboratorsArg).toMatch(/role/)

    const selectProfilesArg: string = spySelect.mock.calls[1][0]
    expect(selectProfilesArg).toMatch(/id/)
    expect(selectProfilesArg).toMatch(/full_name/)
    expect(selectProfilesArg).toMatch(/email/)
  })

  it('applies course_id filter for course isolation', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('course_id', COURSE_ID)
  })

  it('applies tenant_id filter for tenant isolation (critical)', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('applies both course_id and tenant_id filters', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('course_id', COURSE_ID)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('returns mapped Collaborator objects with id, user_id, role, profile', async () => {
    terminalResultByTable.course_collaborators = {
      data: rawCollaboratorRows.map(({ id, user_id, role }) => ({ id, user_id, role })),
      error: null,
    }
    terminalResultByTable.profiles = {
      data: [
        { id: USER_ID, full_name: 'Budi Santoso', email: 'budi@edusync.dev' },
        { id: 'user-456', full_name: 'Siti Rahayu', email: 'siti@edusync.dev' },
      ],
      error: null,
    }
    const result = await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(result).toEqual(expectedCollaborators)
  })

  it('maps the profiles relation to the profile property', async () => {
    terminalResultByTable.course_collaborators = {
      data: rawCollaboratorRows.map(({ id, user_id, role }) => ({ id, user_id, role })),
      error: null,
    }
    terminalResultByTable.profiles = {
      data: [
        { id: USER_ID, full_name: 'Budi Santoso', email: 'budi@edusync.dev' },
        { id: 'user-456', full_name: 'Siti Rahayu', email: 'siti@edusync.dev' },
      ],
      error: null,
    }
    const result = await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(result[0].profile).toEqual({ full_name: 'Budi Santoso', email: 'budi@edusync.dev' })
    expect(result[1].profile).toEqual({ full_name: 'Siti Rahayu', email: 'siti@edusync.dev' })
  })

  it('returns empty array when data is null', async () => {
    terminalResult = { data: null, error: null }
    const result = await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(result).toEqual([])
  })

  it('returns empty array when data is an empty array', async () => {
    terminalResult = { data: [], error: null }
    const result = await collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)
    expect(result).toEqual([])
  })

  it('throws the db error when the query fails', async () => {
    const dbError = new Error('Kesalahan koneksi database')
    terminalResult = { data: null, error: dbError }
    await expect(collaboratorService.fetchCollaborators(COURSE_ID, TENANT_ID)).rejects.toThrow(
      'Kesalahan koneksi database'
    )
  })

  it('does not leak data — passes the exact tenantId to the tenant_id filter', async () => {
    const OTHER_TENANT = 'tenant-other'
    terminalResult = { data: [], error: null }
    await collaboratorService.fetchCollaborators(COURSE_ID, OTHER_TENANT)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(spyEq).not.toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })
})

// ============================================================
// searchUsers
// Chain: .from().select().eq('tenant_id').ilike().limit()
// terminal: .limit() → Promise
// ============================================================

describe('collaboratorService.searchUsers', () => {
  it('returns empty array immediately for an empty query without hitting the DB', async () => {
    const result = await collaboratorService.searchUsers('', TENANT_ID)
    expect(result).toEqual([])
    expect(spyFrom).not.toHaveBeenCalled()
  })

  it('does not call select for an empty query', async () => {
    await collaboratorService.searchUsers('', TENANT_ID)
    expect(spySelect).not.toHaveBeenCalled()
  })

  it('queries the profiles table', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(spyFrom).toHaveBeenCalledWith('profiles')
  })

  it('selects id, full_name, email columns', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(spySelect).toHaveBeenCalledWith('id, full_name, email')
  })

  it('applies tenant_id filter for tenant isolation (critical)', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('applies case-insensitive name search with ilike and %query% pattern', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(spyIlike).toHaveBeenCalledWith('full_name', '%budi%')
  })

  it('wraps query in % wildcards on both sides', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('santoso', TENANT_ID)
    expect(spyIlike).toHaveBeenCalledWith('full_name', '%santoso%')
  })

  it('applies .limit(5) to cap results', async () => {
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(spyLimit).toHaveBeenCalledWith(5)
  })

  it('returns the SearchableUser array from the query', async () => {
    terminalResult = { data: rawProfileRows, error: null }
    const result = await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(result).toEqual(rawProfileRows)
  })

  it('returns empty array when data is null', async () => {
    terminalResult = { data: null, error: null }
    const result = await collaboratorService.searchUsers('budi', TENANT_ID)
    expect(result).toEqual([])
  })

  it('throws the db error when the query fails', async () => {
    const dbError = new Error('Profil tidak ditemukan')
    terminalResult = { data: null, error: dbError }
    await expect(collaboratorService.searchUsers('budi', TENANT_ID)).rejects.toThrow(
      'Profil tidak ditemukan'
    )
  })

  it('scopes the search to the correct tenant — does not search across tenants', async () => {
    const OTHER_TENANT = 'tenant-other'
    terminalResult = { data: [], error: null }
    await collaboratorService.searchUsers('budi', OTHER_TENANT)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', OTHER_TENANT)
    expect(spyEq).not.toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })
})

// ============================================================
// addCollaborator
// Chain: .from().insert({…})  — insert() is terminal (Promise).
// ============================================================

describe('collaboratorService.addCollaborator', () => {
  it('inserts into the course_collaborators table', async () => {
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', TENANT_ID)
    expect(spyFrom).toHaveBeenCalledWith('course_collaborators')
  })

  it('includes course_id in the inserted record', async () => {
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', TENANT_ID)
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ course_id: COURSE_ID }))
  })

  it('includes user_id in the inserted record', async () => {
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', TENANT_ID)
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: USER_ID }))
  })

  it('includes role in the inserted record', async () => {
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'reviewer', TENANT_ID)
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ role: 'reviewer' }))
  })

  it('includes tenant_id in the inserted record (critical for multi-tenant)', async () => {
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', TENANT_ID)
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: TENANT_ID }))
  })

  it('inserts all four required fields in a single call', async () => {
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'publisher', TENANT_ID)
    expect(spyInsert).toHaveBeenCalledWith({
      course_id: COURSE_ID,
      user_id: USER_ID,
      role: 'publisher',
      tenant_id: TENANT_ID,
    })
  })

  it('resolves without a return value on success', async () => {
    terminalResult = { error: null }
    const result = await collaboratorService.addCollaborator(
      COURSE_ID,
      USER_ID,
      'author',
      TENANT_ID
    )
    expect(result).toBeUndefined()
  })

  it('supports the author role', async () => {
    terminalResult = { error: null }
    await expect(
      collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', TENANT_ID)
    ).resolves.toBeUndefined()
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ role: 'author' }))
  })

  it('supports the reviewer role', async () => {
    terminalResult = { error: null }
    await expect(
      collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'reviewer', TENANT_ID)
    ).resolves.toBeUndefined()
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ role: 'reviewer' }))
  })

  it('supports the publisher role', async () => {
    terminalResult = { error: null }
    await expect(
      collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'publisher', TENANT_ID)
    ).resolves.toBeUndefined()
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ role: 'publisher' }))
  })

  it('throws the db error when the insert fails', async () => {
    const dbError = new Error('Pelanggaran kunci unik')
    terminalResult = { error: dbError }
    await expect(
      collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', TENANT_ID)
    ).rejects.toThrow('Pelanggaran kunci unik')
  })

  it('uses the provided tenantId — not a default or fallback', async () => {
    const SPECIFIC_TENANT = 'tenant-specific-999'
    terminalResult = { error: null }
    await collaboratorService.addCollaborator(COURSE_ID, USER_ID, 'author', SPECIFIC_TENANT)
    expect(spyInsert).toHaveBeenCalledWith(expect.objectContaining({ tenant_id: SPECIFIC_TENANT }))
  })
})

// ============================================================
// removeCollaborator
// Chain: .from().delete().eq('id').eq('tenant_id')
// terminal: second .eq() call → Promise
// ============================================================

describe('collaboratorService.removeCollaborator', () => {
  it('targets the course_collaborators table', async () => {
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    expect(spyFrom).toHaveBeenCalledWith('course_collaborators')
  })

  it('calls .delete() on the query builder', async () => {
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    expect(spyDelete).toHaveBeenCalledOnce()
  })

  it('applies .eq("id", id) to target the correct record', async () => {
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('id', COLLABORATOR_ID)
  })

  it('applies .eq("tenant_id", tenantId) to prevent cross-tenant deletion (critical)', async () => {
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('applies both id and tenant_id filters — cannot delete without tenant scope', async () => {
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    expect(spyEq).toHaveBeenCalledWith('id', COLLABORATOR_ID)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('resolves without a return value on success', async () => {
    terminalResult = { error: null }
    const result = await collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    expect(result).toBeUndefined()
  })

  it('throws the db error when the delete fails', async () => {
    const dbError = new Error('Rekaman tidak ditemukan')
    terminalResult = { error: dbError }
    await expect(
      collaboratorService.removeCollaborator(COLLABORATOR_ID, TENANT_ID)
    ).rejects.toThrow('Rekaman tidak ditemukan')
  })

  it('uses the exact tenantId provided — never a wildcard or default', async () => {
    const SPECIFIC_TENANT = 'tenant-specific-999'
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, SPECIFIC_TENANT)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', SPECIFIC_TENANT)
    expect(spyEq).not.toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })

  it('cannot be used to delete a record belonging to another tenant', async () => {
    const ATTACKER_TENANT = 'tenant-attacker'
    terminalResult = { error: null }
    await collaboratorService.removeCollaborator(COLLABORATOR_ID, ATTACKER_TENANT)
    expect(spyEq).toHaveBeenCalledWith('tenant_id', ATTACKER_TENANT)
    expect(spyEq).not.toHaveBeenCalledWith('tenant_id', TENANT_ID)
  })
})
