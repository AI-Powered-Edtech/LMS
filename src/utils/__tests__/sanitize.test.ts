import { describe, expect,it } from 'vitest'

import { escapeHtml } from '../sanitize'

describe('escapeHtml', () => {
  it('should return the same string if there are no special characters', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World')
    expect(escapeHtml('1234567890')).toBe('1234567890')
    expect(escapeHtml('abcdefg-_+=')).toBe('abcdefg-_+=')
  })

  it('should escape ampersands (&)', () => {
    expect(escapeHtml('Me & You')).toBe('Me &amp; You')
    expect(escapeHtml('&&&&')).toBe('&amp;&amp;&amp;&amp;')
  })

  it('should escape less than (<) and greater than (>)', () => {
    expect(escapeHtml('5 < 10')).toBe('5 &lt; 10')
    expect(escapeHtml('10 > 5')).toBe('10 &gt; 5')
    expect(escapeHtml('<html>')).toBe('&lt;html&gt;')
  })

  it('should escape double quotes (")', () => {
    expect(escapeHtml('He said "Hello"')).toBe('He said &quot;Hello&quot;')
    expect(escapeHtml('""')).toBe('&quot;&quot;')
  })

  it("should escape single quotes (')", () => {
    expect(escapeHtml("It's a beautiful day")).toBe('It&#039;s a beautiful day')
    expect(escapeHtml("''")).toBe('&#039;&#039;')
  })

  it('should escape combinations of special characters', () => {
    expect(escapeHtml('<script>alert("XSS & \'pwned\'")</script>')).toBe(
      '&lt;script&gt;alert(&quot;XSS &amp; &#039;pwned&#039;&quot;)&lt;/script&gt;'
    )
    expect(escapeHtml('a & b < c > d "e" \'f\'')).toBe(
      'a &amp; b &lt; c &gt; d &quot;e&quot; &#039;f&#039;'
    )
  })

  it('should handle empty strings', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('should handle strings that only consist of special characters', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;')
  })
})
