import { type Page, type Route } from '@playwright/test'

export type Persona = 'teacher' | 'student' | 'admin' | 'parent' | 'principal'

interface PersonaData {
  id: string
  email: string
  role: Persona
  tenant_id: string
  full_name: string
  email_confirmed_at: string
}

const VERIFIED_AT = new Date(Date.now() - 86_400_000).toISOString()

export const PERSONAS: Record<Persona, PersonaData> = {
  teacher: {
    id: 'teacher-id-001',
    email: 'teacher@edusync.dev',
    role: 'teacher',
    tenant_id: 'tenant-001',
    full_name: 'Bu Siti Teacher',
    email_confirmed_at: VERIFIED_AT,
  },
  student: {
    id: 'student-id-001',
    email: 'student@edusync.dev',
    role: 'student',
    tenant_id: 'tenant-001',
    full_name: 'Andi Student',
    email_confirmed_at: VERIFIED_AT,
  },
  admin: {
    id: 'admin-id-001',
    email: 'admin@edusync.dev',
    role: 'admin',
    tenant_id: 'tenant-001',
    full_name: 'Pak Admin',
    email_confirmed_at: VERIFIED_AT,
  },
  parent: {
    id: 'parent-id-001',
    email: 'parent@edusync.dev',
    role: 'parent',
    tenant_id: 'tenant-001',
    full_name: 'Bunda Wati',
    email_confirmed_at: VERIFIED_AT,
  },
  principal: {
    id: 'principal-id-001',
    email: 'principal@edusync.dev',
    role: 'principal',
    tenant_id: 'tenant-001',
    full_name: 'Pak Kepala',
    email_confirmed_at: VERIFIED_AT,
  },
}

function makeSession(persona: PersonaData) {
  return {
    access_token: 'mock-access-token-' + persona.role,
    refresh_token: 'mock-refresh-token-' + persona.role,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: persona,
  }
}

function jsonRoute(route: Route, data: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

/**
 * Install a catch-all API mock. This:
 *   - returns the persona for /auth/login, /auth/bootstrap, /auth/refresh
 *   - returns empty lists for listable resources
 *   - returns a success envelope for everything else
 * Specific routes can be overridden per test by registering before this.
 */
export async function mockApi(page: Page, persona: Persona) {
  const user = PERSONAS[persona]
  const session = makeSession(user)

  // Track errors
  const consoleErrors: string[] = []
  const pageErrors: string[] = []
  const failedRequests: string[] = []
  ;(page as any)._qa = { consoleErrors, pageErrors, failedRequests }

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (
        text.includes('Failed to load resource') ||
        text.includes('ERR_CONNECTION_REFUSED') ||
        text.includes('net::ERR')
      ) {
        return
      }
      consoleErrors.push(text)
    }
  })
  page.on('pageerror', (err) => {
    pageErrors.push(String(err.message || err))
  })
  page.on('requestfailed', (req) => {
    failedRequests.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText || ''}`)
  })

  // Catch-all registered FIRST — Playwright calls LAST-registered handler, so
  // specific routes below override this.
  await page.route('**/api/v1/**', (route) => {
    const url = route.request().url()
    const method = route.request().method()
    if (method !== 'GET') {
      return jsonRoute(route, { success: true, id: 'mock-' + Date.now() })
    }
    // Single-resource lookup (uuid / numeric id) → return empty object
    if (/\/[a-f0-9-]{36}(\?|$)/.test(url) || /\/\d+(\?|$)/.test(url)) {
      return jsonRoute(route, {})
    }
    // Provide a generous envelope with all common list-shape keys so the
    // page code can access whatever shape it expects without crashing.
    return jsonRoute(route, {
      data: [],
      total: 0,
      count: 0,
      items: [],
      courses: [],
      quizzes: [],
      assignments: [],
      students: [],
      classes: [],
      results: [],
      rows: [],
    })
  })

  // Tenant / profile
  await page.route('**/api/v1/tenants/*', (route) =>
    jsonRoute(route, {
      id: user.tenant_id,
      name: 'SMA Nusantara Demo',
      slug: 'sma-nusantara',
      plan: 'demo',
    })
  )
  await page.route('**/api/v1/profile**', (route) => jsonRoute(route, user))
  await page.route('**/api/v1/users/me**', (route) => jsonRoute(route, user))

  // Auth endpoints (registered LAST so they win over catch-all)
  await page.route('**/api/v1/auth/login', (route) =>
    jsonRoute(route, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user,
    })
  )
  await page.route('**/api/v1/auth/bootstrap', (route) =>
    jsonRoute(route, {
      profile: {
        id: user.id,
        email: user.email,
        first_name: user.full_name.split(' ')[0],
        last_name: user.full_name.split(' ').slice(1).join(' ') || 'Demo',
        avatar_url: null,
        tenant_id: user.tenant_id,
      },
      memberships: [
        {
          tenant_id: user.tenant_id,
          tenant_name: 'SMA Nusantara Demo',
          tenant_slug: 'sma-nusantara',
          tenant_logo: null,
          role: user.role,
          status: 'active',
          is_active: true,
          joined_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
        },
      ],
      default_tenant_id: user.tenant_id,
      requires_email_verification: false,
    })
  )
  await page.route('**/api/v1/auth/refresh', (route) =>
    jsonRoute(route, {
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_in: session.expires_in,
      token_type: 'bearer',
      user,
    })
  )
  await page.route('**/api/v1/auth/signout', (route) => jsonRoute(route, { success: true }))
  await page.route('**/api/v1/auth/switch-tenant', (route) => jsonRoute(route, { user, session }))
  await page.route('**/api/v1/auth/mfa/**', (route) => jsonRoute(route, {}))

  // Seed sessionStorage + activeTenantId hint so guards pass without UI detour
  await page.addInitScript((payload) => {
    try {
      sessionStorage.setItem(
        'vil_auth_session',
        JSON.stringify({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
          expires_in: payload.expires_in,
          expires_at: payload.expires_at,
          token_type: 'bearer',
          user: payload.user,
        })
      )
      localStorage.setItem('activeTenantId', payload.tenantId)
      // Dismiss all known onboarding wizards so they don't hide content
      localStorage.setItem('onboarded_teacher', '1')
      localStorage.setItem('onboarded_student', '1')
      localStorage.setItem('onboarded_admin', '1')
      localStorage.setItem('edusync_teacher_onboarding_completed', '1')
      localStorage.setItem('edusync_teacher_onboarding_dismissed', '1')
    } catch (e) {
      // ignore
    }
  }, { ...session, tenantId: user.tenant_id })
}

export function getQaState(page: Page): {
  consoleErrors: string[]
  pageErrors: string[]
  failedRequests: string[]
} {
  return (
    (page as any)._qa ?? {
      consoleErrors: [],
      pageErrors: [],
      failedRequests: [],
    }
  )
}
