import { beforeEach, describe, expect, it } from 'vitest'

import {
  consumePostAuthRedirect,
  isAuthSurfacePath,
  normalizeLegacyHashUrl,
  persistPostAuthRedirect,
  sanitizeRedirectTarget,
} from '../authFlow'

describe('authFlow utils', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('normalizes legacy hash URLs into browser paths', () => {
    expect(normalizeLegacyHashUrl({ hash: '#/join?code=ABC123' } as Location)).toBe(
      '/join?code=ABC123'
    )
    expect(normalizeLegacyHashUrl({ hash: '#section' } as Location)).toBeNull()
  })

  it('stores and consumes sanitized post-auth redirects', () => {
    persistPostAuthRedirect('/app/teacher/dashboard?course=1')

    expect(consumePostAuthRedirect()).toBe('/app/teacher/dashboard?course=1')
    expect(consumePostAuthRedirect()).toBeNull()
  })

  it('rejects auth callback and external redirects', () => {
    expect(sanitizeRedirectTarget('/auth/callback?code=123')).toBeNull()
    expect(sanitizeRedirectTarget('https://evil.example.com/phish')).toBeNull()
  })

  it('detects auth surface paths with query params', () => {
    expect(isAuthSurfacePath('/login?invite=abc')).toBe(true)
    expect(isAuthSurfacePath('/workspace-selector')).toBe(true)
    expect(isAuthSurfacePath('/app/student/dashboard')).toBe(false)
  })
})
