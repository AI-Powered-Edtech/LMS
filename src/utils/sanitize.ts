/**
 * HTML entity escaping to prevent XSS when interpolating user content into raw HTML strings.
 * Use this whenever user-controlled data is injected into document.write(), innerHTML,
 * or any other raw HTML context outside of React's JSX escaping.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#039;",
};

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param str - The string to escape
 * @returns The escaped string safe for HTML interpolation
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char]);
}

/**
 * Sanitizes a URL to prevent XSS via javascript: or data: URIs.
 * Returns the original URL if safe, or '#' if unsafe.
 * @param url - The URL to sanitize
 * @returns The sanitized URL
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "#";

  try {
    const parsed = new URL(url, "http://dummy.base");
    const protocol = parsed.protocol.toLowerCase();

    // Allow common safe protocols. Note that 'dummy.base' makes relative URLs parse as http:
    if (["http:", "https:", "mailto:", "tel:"].includes(protocol)) {
      return url;
    }

    // If it's some other protocol (like javascript:, vbscript:, data:), block it.
    return "#";
  } catch {
    // If URL parsing fails, err on the side of caution.
    return "#";
  }
}
