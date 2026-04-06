// ==========================================================================
// API Version Resolver — Shared Module for Edge Functions
// Sprint C: API Versioning Strategy
//
// Date-based versioning with backward compatibility.
// See API_VERSIONING.md for full strategy documentation.
// ==========================================================================

export const CURRENT_VERSION = '2026-04-01'
export const SUPPORTED_VERSIONS = ['2026-01-01', '2026-04-01'] as const
export type ApiVersion = typeof SUPPORTED_VERSIONS[number]

/**
 * Resolves the API version from the request headers.
 * Falls back to CURRENT_VERSION if no valid version header is present.
 */
export function resolveVersion(req: Request): ApiVersion {
  const header = req.headers.get('X-API-Version')
  if (header && (SUPPORTED_VERSIONS as readonly string[]).includes(header)) {
    return header as ApiVersion
  }
  return CURRENT_VERSION
}

/**
 * Adds version and deprecation headers to the response.
 */
export function addVersionHeaders(response: Response, version: ApiVersion): Response {
  const headers = new Headers(response.headers)
  headers.set('X-API-Version', version)
  headers.set('X-API-Deprecated', version !== CURRENT_VERSION ? 'true' : 'false')

  // Set sunset dates for deprecated versions
  const sunsetMap: Partial<Record<ApiVersion, string>> = {
    '2026-01-01': '2026-10-01',
  }
  const sunset = sunsetMap[version]
  if (sunset) {
    headers.set('X-API-Sunset', sunset)
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

/**
 * Adds version metadata to the response body for clients
 * that can't read response headers (e.g., Supabase JS client).
 */
export function withVersionMeta<T extends Record<string, unknown>>(
  data: T,
  version: ApiVersion
): T & { _meta: { version: string; deprecated: boolean; sunset?: string } } {
  return {
    ...data,
    _meta: {
      version,
      deprecated: version !== CURRENT_VERSION,
      ...(version === '2026-01-01' ? { sunset: '2026-10-01' } : {}),
    },
  }
}