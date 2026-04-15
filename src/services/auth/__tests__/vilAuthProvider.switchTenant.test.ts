import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createVilAuthProvider } from '../vilAuthProvider'
import { clearVilSession, readVilSession, writeVilSession } from '../vilSession'

describe('vilAuthProvider.switchTenant', () => {
  beforeEach(() => {
    clearVilSession()
    vi.restoreAllMocks()
  })

  it('memanggil endpoint switch-tenant dan memperbarui session storage', async () => {
    writeVilSession({
      access_token: 'old-access',
      refresh_token: 'old-refresh',
      user: { id: 'user-1', email: 'user@edusync.dev' },
    })

    const provider = createVilAuthProvider('https://api.example')

    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 3600,
          token_type: 'bearer',
          user: { id: 'user-1', email: 'user@edusync.dev', role: 'student', tenant_id: 't-2' },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )

    vi.stubGlobal('fetch', fetchMock)

    const result = await provider.switchTenant({ tenantId: 't-2' })

    expect(result.error).toBeNull()
    expect(result.data.session?.access_token).toBe('new-access')
    expect(readVilSession()?.access_token).toBe('new-access')
    expect(readVilSession()?.refresh_token).toBe('new-refresh')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.example/api/v1/auth/switch-tenant')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer old-access')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ tenant_id: 't-2', refresh_token: 'old-refresh' }))
  })
})

