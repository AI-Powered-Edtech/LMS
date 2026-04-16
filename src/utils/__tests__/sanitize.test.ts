import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUrl } from '../sanitize';

describe('escapeHtml', () => {
  it('should escape a string containing HTML special characters', () => {
    const input = '<script>alert("XSS & co.")</script>';
    const expected = '&lt;script&gt;alert(&quot;XSS &amp; co.&quot;)&lt;/script&gt;';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should return the original string if no special characters are present', () => {
    const input = 'Hello World';
    expect(escapeHtml(input)).toBe(input);
  });

  it('should escape single quotes', () => {
    const input = "It's a wonderful day";
    const expected = 'It&#039;s a wonderful day';
    expect(escapeHtml(input)).toBe(expected);
  });

  it('should handle an empty string', () => {
    expect(escapeHtml('')).toBe('');
  });
});

describe('sanitizeUrl', () => {
  it('should return "#" for null or undefined input', () => {
    expect(sanitizeUrl(null)).toBe('#');
    expect(sanitizeUrl(undefined)).toBe('#');
  });

  it('should return "#" for empty string', () => {
    expect(sanitizeUrl('')).toBe('#');
  });

  it('should allow valid http and https URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(sanitizeUrl('https://example.com/path?query=1')).toBe('https://example.com/path?query=1');
  });

  it('should allow valid mailto and tel URLs', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
    expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
  });

  it('should allow relative paths', () => {
    expect(sanitizeUrl('/app/dashboard')).toBe('/app/dashboard');
    expect(sanitizeUrl('about.html')).toBe('about.html');
  });

  it('should block javascript: URIs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeUrl('javascript:void(0)')).toBe('#');
    expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBe('#'); // Case insensitive check
  });

  it('should block data: URIs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
  });

  it('should block vbscript: URIs', () => {
    expect(sanitizeUrl('vbscript:msgbox("hello")')).toBe('#');
  });

  it('should return "#" for malformed URLs that cannot be parsed', () => {
    // URL parser is quite permissive, but if we pass something that throws, it should return '#'
    // For example, an invalid protocol format might not throw in new URL(), but
    // since we test against known valid ones, it covers our needs.
    // We can simulate an unparsable by checking something that fails URL constructor if possible
    // or just rely on the fallback.
    expect(sanitizeUrl('ftp://example.com')).toBe('#'); // Fails the allowlist
  });
  it('should return "#" when URL parsing throws an error', () => {
    // This is hard to trigger with the standard URL constructor since it parses most things
    // when given a base URL, but we can mock URL temporarily or use something that definitely throws
    // with certain old browsers, or try a URL that is too long etc.
    // Instead of complicated mocking, we will just rely on the existing malformed case
    // and note that `try/catch` is hit in case of genuinely invalid UTF/URL format that JS engine rejects.
    // We can force a throw by passing something that is not a string if we bypassed TS,
    // but in TS it's typed. We'll use a mocked URL constructor for this one test.
    const originalURL = global.URL;
    global.URL = class {
      constructor() {
        throw new TypeError('Invalid URL');
      }
    } as any;

    try {
      expect(sanitizeUrl('anything')).toBe('#');
    } finally {
      // Restore
      global.URL = originalURL;
    }
  });
});
