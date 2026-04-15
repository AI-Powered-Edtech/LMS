import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ltiService } from '../api/ltiService'

// ── DB mock ─────────────────────────────────────────────────────
const mockFrom = vi.fn()

vi.mock('@/services/db', () => ({
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

function makeChain(resolveWith: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'select',
    'eq',
    'order',
    'limit',
    'maybeSingle',
    'single',
    'delete',
    'insert',
    'update',
  ]
  for (const m of methods) {
    chain[m] = vi.fn().mockReturnValue(chain)
  }
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(resolveWith).then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ── fetchPlatforms ─────────────────────────────────────────────
describe('ltiService.fetchPlatforms', () => {
  it('queries lti_platform_registrations with tenant filter', async () => {
    const mockData = [
      { id: 'p1', name: 'Canvas', issuer: 'https://canvas.example.com' },
      { id: 'p2', name: 'Moodle', issuer: 'https://moodle.example.com' },
    ]
    mockFrom.mockReturnValue(makeChain({ data: mockData, error: null }))

    const result = await ltiService.fetchPlatforms('t1')

    expect(mockFrom).toHaveBeenCalledWith('lti_platform_registrations')
    expect(result).toEqual(mockData)
  })

  it('throws on db error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }))

    await expect(ltiService.fetchPlatforms('t1')).rejects.toEqual({
      message: 'DB error',
    })
  })

  it('returns empty array when no data', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const result = await ltiService.fetchPlatforms('t1')
    expect(result).toEqual([])
  })
})

// ── fetchPlatform ──────────────────────────────────────────────
describe('ltiService.fetchPlatform', () => {
  it('returns single platform by id + tenant', async () => {
    const platform = { id: 'p1', name: 'Canvas', issuer: 'https://canvas.example.com' }
    mockFrom.mockReturnValue(makeChain({ data: platform, error: null }))

    const result = await ltiService.fetchPlatform('p1', 't1')

    expect(mockFrom).toHaveBeenCalledWith('lti_platform_registrations')
    expect(result).toEqual(platform)
  })

  it('returns null when not found', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const result = await ltiService.fetchPlatform('nonexistent', 't1')
    expect(result).toBeNull()
  })
})

// ── createPlatform ─────────────────────────────────────────────
describe('ltiService.createPlatform', () => {
  it('inserts with correct params', async () => {
    const created = { id: 'new-id', name: 'Canvas Prod' }
    mockFrom.mockReturnValue(makeChain({ data: created, error: null }))

    const params = {
      name: 'Canvas Prod',
      issuer: 'https://canvas.instructure.com',
      client_id: '10000000000001',
      auth_endpoint: 'https://canvas.instructure.com/api/lti/authorize_redirect',
      token_endpoint: 'https://canvas.instructure.com/login/oauth2/token',
      jwks_url: 'https://canvas.instructure.com/api/lti/security/jwks',
    }

    const result = await ltiService.createPlatform(params)

    expect(mockFrom).toHaveBeenCalledWith('lti_platform_registrations')
    expect(result).toEqual(created)
  })

  it('throws on insert error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Duplicate' } }))

    await expect(
      ltiService.createPlatform({
        name: 'Test',
        issuer: 'https://test.com',
        client_id: '123',
        auth_endpoint: 'https://test.com/auth',
        token_endpoint: 'https://test.com/token',
        jwks_url: 'https://test.com/jwks',
      })
    ).rejects.toEqual({ message: 'Duplicate' })
  })
})

// ── updatePlatform ─────────────────────────────────────────────
describe('ltiService.updatePlatform', () => {
  it('updates with id + tenant filter', async () => {
    const updated = { id: 'p1', name: 'Canvas Updated' }
    mockFrom.mockReturnValue(makeChain({ data: updated, error: null }))

    const result = await ltiService.updatePlatform({ id: 'p1', name: 'Canvas Updated' }, 't1')

    expect(mockFrom).toHaveBeenCalledWith('lti_platform_registrations')
    expect(result).toEqual(updated)
  })
})

// ── deletePlatform ─────────────────────────────────────────────
describe('ltiService.deletePlatform', () => {
  it('deletes with id + tenant filter', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    await ltiService.deletePlatform('p1', 't1')

    expect(mockFrom).toHaveBeenCalledWith('lti_platform_registrations')
  })

  it('throws on delete error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'FK violation' } }))

    await expect(ltiService.deletePlatform('p1', 't1')).rejects.toEqual({
      message: 'FK violation',
    })
  })
})

// ── togglePlatform ─────────────────────────────────────────────
describe('ltiService.togglePlatform', () => {
  it('updates is_active flag', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    await ltiService.togglePlatform('p1', false, 't1')

    expect(mockFrom).toHaveBeenCalledWith('lti_platform_registrations')
  })

  it('throws on toggle error', async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Update failed' } }))

    await expect(ltiService.togglePlatform('p1', true, 't1')).rejects.toEqual({
      message: 'Update failed',
    })
  })
})
