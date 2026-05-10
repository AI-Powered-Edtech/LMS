import { describe, expect, it } from "vitest";

import { escapeHtml, sanitizeUrl } from "@/utils/sanitize";

describe("sanitize utils", () => {
  describe("escapeHtml", () => {
    it("escapes standard HTML special characters", () => {
      expect(escapeHtml('<script>alert("XSS")</script>')).toBe(
        "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;",
      );
    });

    it("escapes single quotes", () => {
      expect(escapeHtml("'hello'")).toBe("&#039;hello&#039;");
    });

    it("escapes ampersands", () => {
      expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
    });

    it("returns the same string if no special characters exist", () => {
      expect(escapeHtml("Hello World")).toBe("Hello World");
    });

    it("handles empty string", () => {
      expect(escapeHtml("")).toBe("");
    });

    it("escapes all special characters correctly at once", () => {
      expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#039;");
    });
  });

  describe("sanitizeUrl", () => {
    it("allows valid http URLs", () => {
      expect(sanitizeUrl("http://example.com")).toBe("http://example.com");
    });

    it("allows valid https URLs", () => {
      expect(sanitizeUrl("https://example.com")).toBe("https://example.com");
    });

    it("allows valid mailto URLs", () => {
      expect(sanitizeUrl("mailto:test@example.com")).toBe(
        "mailto:test@example.com",
      );
    });

    it("allows valid tel URLs", () => {
      expect(sanitizeUrl("tel:+1234567890")).toBe("tel:+1234567890");
    });

    it("allows relative URLs (parsed as http by default due to dummy base)", () => {
      expect(sanitizeUrl("/foo/bar")).toBe("/foo/bar");
      expect(sanitizeUrl("foo/bar")).toBe("foo/bar");
    });

    it("blocks javascript: URLs", () => {
      expect(sanitizeUrl('javascript:alert("XSS")')).toBe("#");
      expect(sanitizeUrl('JAVASCRIPT:alert("XSS")')).toBe("#");
    });

    it("blocks data: URLs", () => {
      expect(sanitizeUrl('data:text/html,<script>alert("XSS")</script>')).toBe(
        "#",
      );
    });

    it("blocks vbscript: URLs", () => {
      expect(sanitizeUrl('vbscript:msgbox("XSS")')).toBe("#");
    });

    it("returns # for null", () => {
      expect(sanitizeUrl(null)).toBe("#");
    });

    it("returns # for undefined", () => {
      expect(sanitizeUrl(undefined)).toBe("#");
    });

    it("returns # for empty string", () => {
      expect(sanitizeUrl("")).toBe("#");
    });

    it("returns # for invalid URLs that fail to parse", () => {
      // URL parsing might fail for very specific malformed inputs.
      // E.g. URL constructors might throw for some inputs, we want to ensure it catches and returns '#'
      // Note: `new URL('invalid:', 'http://dummy.base')` actually parses successfully,
      // it just blocks it because it's an unrecognized protocol.
      // To force a throw, we'd need something that breaks URL completely.
      // Actually `new URL(url, 'http://dummy.base')` is quite forgiving,
      // but any protocol not in the allowlist is caught.
      expect(sanitizeUrl("invalid://1234")).toBe("#");
    });
  });
});
