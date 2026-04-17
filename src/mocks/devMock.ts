export function setupDevMocks() {
  if (!import.meta.env.DEV) return

  const originalFetch = window.fetch

  window.fetch = async (input, init) => {
    let url = ''
    if (typeof input === 'string') {
      url = input
    } else if (input instanceof URL) {
      url = input.toString()
    } else if (input instanceof Request) {
      url = input.url
    }

    if (url.includes('/api/v1/auth/login')) {
      const body = init?.body ? JSON.parse(init.body as string) : {}
      const role = body.email.split('@')[0]
      return new Response(
        JSON.stringify({
          access_token: 'mock-token-123',
          refresh_token: 'mock-refresh-123',
          expires_in: 3600,
          user: {
            id: `mock-${role}-id`,
            email: body.email,
            role: role === 'student' ? 'student' : role === 'teacher' ? 'teacher' : 'admin',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (url.includes('/api/v1/auth/bootstrap')) {
      return new Response(
        JSON.stringify({
          profile: {
            id: 'mock-id',
            first_name: 'Dev',
            last_name: 'User',
            avatar_url: null,
            email: 'dev@edusync.dev',
          },
          memberships: [
            {
              tenant_id: 'mock-tenant-id',
              tenant_name: 'Mock School',
              tenant_slug: 'mock-school',
              role: 'teacher',
              status: 'active',
              is_active: true,
              joined_at: new Date().toISOString(),
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (url.includes('/api/v1/auth/switch-tenant')) {
      return new Response(
        JSON.stringify({
          access_token: 'mock-token-123',
          refresh_token: 'mock-refresh-123',
          expires_in: 3600,
          user: {
            id: `mock-id`,
            email: 'teacher@edusync.dev',
            role: 'teacher',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Mock API requests for the dashboard
    if (url.includes('/api/v1/data') || url.includes('/api/v1/courses') || url.includes('/api/v1/')) {
      // Just return empty array for data to prevent crashes
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return originalFetch(input, init)
  }
}
