import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeUrl } from '../sanitize';

describe('sanitize', () => {
  describe('escapeHtml', () => {
    it('returns the same string if there are no special characters', () => {
      expect(escapeHtml('Hello world')).toBe('Hello world');
      expect(escapeHtml('12345')).toBe('12345');
    });

    it('escapes < and >', () => {
      expect(escapeHtml('<div>Hello</div>')).toBe('&lt;div&gt;Hello&lt;/div&gt;');
    });

    it('escapes &', () => {
      expect(escapeHtml('Salt & Pepper')).toBe('Salt &amp; Pepper');
    });

    it('escapes double and single quotes', () => {
      expect(escapeHtml('"Double" and \'Single\'')).toBe('&quot;Double&quot; and &#039;Single&#039;');
    });

    it('escapes all special characters together', () => {
      expect(escapeHtml('<script>alert("XSS & \'attack\'")</script>')).toBe(
        '&lt;script&gt;alert(&quot;XSS &amp; &#039;attack&#039;&quot;)&lt;/script&gt;'
      );
    });

    it('handles empty strings', () => {
      expect(escapeHtml('')).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    it('returns "#" for null, undefined, or empty string', () => {
      expect(sanitizeUrl(null)).toBe('#');
      expect(sanitizeUrl(undefined)).toBe('#');
      expect(sanitizeUrl('')).toBe('#');
    });

    it('allows safe http and https URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
      expect(sanitizeUrl('https://example.com/path?query=1')).toBe('https://example.com/path?query=1');
    });

    it('allows mailto: and tel: URLs', () => {
      expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
      expect(sanitizeUrl('tel:+1234567890')).toBe('tel:+1234567890');
    });

    it('allows relative URLs', () => {
      expect(sanitizeUrl('/path/to/resource')).toBe('/path/to/resource');
      expect(sanitizeUrl('relative/path')).toBe('relative/path');
      expect(sanitizeUrl('?query=1')).toBe('?query=1');
      expect(sanitizeUrl('#hash')).toBe('#hash');
    });

    it('blocks unsafe protocols like javascript: and data:', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
      expect(sanitizeUrl('JaVaScRiPt:alert(1)')).toBe('#');
      expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
      expect(sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
    });

    it('handles malformed URL exceptions gracefully', () => {
      // By overriding URL globally we can simulate a throw in the try-catch block
      const originalURL = global.URL;
      global.URL = class {
        constructor() {
          throw new Error('Invalid URL');
        }
      } as any;

      expect(sanitizeUrl('http://example.com')).toBe('#');

      // Restore URL
      global.URL = originalURL;
    });
  });
});
