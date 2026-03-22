/**
 * HTML entity escaping to prevent XSS when interpolating user content into raw HTML strings.
 * Use this whenever user-controlled data is injected into document.write(), innerHTML,
 * or any other raw HTML context outside of React's JSX escaping.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;',
}

/**
 * Escapes HTML special characters in a string to prevent XSS.
 * @param str - The string to escape
 * @returns The escaped string safe for HTML interpolation
 */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char])
}
