import { describe, expect, it } from 'vitest'

import { escapeHtml } from '../sanitize'

describe('sanitize', () => {
  describe('escapeHtml', () => {
    it('harus escape ampersand (&)', () => {
      expect(escapeHtml('A & B')).toBe('A &amp; B')
    })

    it('harus escape less-than (<)', () => {
      expect(escapeHtml('<script>')).toBe('&lt;script&gt;')
    })

    it('harus escape greater-than (>)', () => {
      expect(escapeHtml('tag >')).toBe('tag &gt;')
    })

    it('harus escape double-quote (")', () => {
      expect(escapeHtml('nilai="test"')).toBe('nilai=&quot;test&quot;')
    })

    it('harus escape single-quote (\')', () => {
      expect(escapeHtml("onclick='alert()")).toBe('onclick=&#039;alert()')
    })

    it('harus escape multiple special characters', () => {
      expect(escapeHtml('<img src="x" onerror="alert()">')).toBe(
        '&lt;img src=&quot;x&quot; onerror=&quot;alert()&quot;&gt;'
      )
    })

    it('harus mengembalikan string kosong jika input kosong', () => {
      expect(escapeHtml('')).toBe('')
    })

    it('harus mengembalikan string normal tanpa perubahan jika tidak ada karakter spesial', () => {
      expect(escapeHtml('Teks biasa tanpa HTML')).toBe('Teks biasa tanpa HTML')
    })

    it('harus escape semua kombinasi XSS payload', () => {
      const payload = '"><script>alert("XSS")</script>'
      expect(escapeHtml(payload)).toBe(
        '&quot;&gt;&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
      )
    })

    it('harus handle multiple ampersand dalam string', () => {
      expect(escapeHtml('A & B & C')).toBe('A &amp; B &amp; C')
    })

    it('harus preserve nomor dan huruf normal', () => {
      expect(escapeHtml('Hello123 World')).toBe('Hello123 World')
    })

    it('harus escape HTML entities dalam atribut nilai', () => {
      expect(escapeHtml('data-value="<test>"')).toBe('data-value=&quot;&lt;test&gt;&quot;')
    })
  })
})
