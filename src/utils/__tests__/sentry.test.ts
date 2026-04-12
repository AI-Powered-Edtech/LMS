import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as Sentry from '@sentry/react'
import {
  initSentry,
  setSentryUser,
  clearSentryUser,
  captureError,
  addBreadcrumb,
} from '../sentry'

vi.mock('@sentry/react', () => {
  return {
    init: vi.fn(),
    setUser: vi.fn(),
    setContext: vi.fn(),
    captureException: vi.fn(),
    addBreadcrumb: vi.fn(),
    browserTracingIntegration: vi.fn(),
    replayIntegration: vi.fn(),
  }
})

describe('Sentry Utilities', () => {

  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubEnv('VITE_SENTRY_DSN', 'https://mock-dsn@sentry.io/123')
    vi.stubEnv('MODE', 'production')
    vi.stubEnv('PROD', 'true')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('initSentry', () => {
    it('does not initialize Sentry if VITE_SENTRY_DSN is missing', () => {
      vi.stubEnv('VITE_SENTRY_DSN', '')
      initSentry()
      expect(Sentry.init).not.toHaveBeenCalled()
    })

    it('initializes Sentry when DSN is present', () => {
      initSentry()
      expect(Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'https://mock-dsn@sentry.io/123',
          environment: 'production',
          release: 'edusync-lms@1.0.0',
          enabled: true,
        })
      )
    })

    it('strips authorization headers in beforeBreadcrumb', () => {
      initSentry()
      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeBreadcrumb = initCall.beforeBreadcrumb!

      const mockBreadcrumb = {
        category: 'fetch',
        data: {
          headers: {
            Authorization: 'Bearer secret-token',
            'Content-Type': 'application/json',
          },
          requestHeaders: {
            authorization: 'Bearer another-secret',
            accept: '*/*',
          },
        },
      } as any

      const result = beforeBreadcrumb(mockBreadcrumb)

      expect(result.data.headers.Authorization).toBe('[Filtered]')
      expect(result.data.headers['Content-Type']).toBe('application/json')
      expect(result.data.requestHeaders.authorization).toBe('[Filtered]')
      expect(result.data.requestHeaders.accept).toBe('*/*')
    })

    it('scrubs sensitive data in beforeSend', () => {
      initSentry()
      const initCall = vi.mocked(Sentry.init).mock.calls[0][0]
      const beforeSend = initCall.beforeSend!

      const mockEvent = {
        user: { email: 'user@example.com' },
        request: {
          cookies: { session: 'mock-session-id' },
          headers: {
            Authorization: 'Bearer test-token',
            Cookie: 'test-cookie',
          },
          data: {
            password: 'super-secret-password',
            nested: { token: 'hidden-token' },
            safeField: 'visible-value',
          },
          query_string: '?token=123&safe=yes',
        },
        breadcrumbs: [
          { data: { secretKey: 'my-secret' } },
        ],
        extra: {
          api_key: 'test-api-key',
        },
      } as any

      const result = beforeSend(mockEvent)

      expect(result.request.cookies).toBeUndefined()
      expect(result.user.email).toBe('[Filtered]')
      expect(result.request.headers.Authorization).toBe('[Filtered]')
      expect(result.request.headers.Cookie).toBe('[Filtered]')

      expect(result.request.data.password).toBe('[Filtered]')
      expect(result.request.data.nested.token).toBe('[Filtered]')
      expect(result.request.data.safeField).toBe('visible-value')

      expect(result.request.query_string).toBe('?token=[Filtered]&safe=yes')

      expect(result.breadcrumbs[0].data.secretKey).toBe('[Filtered]')
      expect(result.extra.api_key).toBe('[Filtered]')
    })
  })

  describe('setSentryUser', () => {
    it('sets the Sentry user', () => {
      setSentryUser('user-1', 'admin')
      expect(Sentry.setUser).toHaveBeenCalledWith({ id: 'user-1', role: 'admin' })
    })
  })

  describe('clearSentryUser', () => {
    it('clears the Sentry user', () => {
      clearSentryUser()
      expect(Sentry.setUser).toHaveBeenCalledWith(null)
    })
  })

  describe('captureError', () => {
    it('captures an exception without context', () => {
      const error = new Error('Test Error')
      captureError(error)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
      expect(Sentry.setContext).not.toHaveBeenCalled()
    })

    it('captures an exception with context', () => {
      const error = new Error('Test Error')
      const context = { extraData: 'foo' }
      captureError(error, context)
      expect(Sentry.setContext).toHaveBeenCalledWith('extra', context)
      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('addBreadcrumb', () => {
    it('adds a breadcrumb with the provided data', () => {
      const data = { action: 'clicked' }
      addBreadcrumb('Button Clicked', 'ui', data)
      expect(Sentry.addBreadcrumb).toHaveBeenCalledWith({
        message: 'Button Clicked',
        category: 'ui',
        data,
        level: 'info',
      })
    })
  })
})
