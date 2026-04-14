import { readVilSession } from '@/services/auth/vilSession'

type JsonRecord = Record<string, unknown>

type DivergenceSeverity = 'info' | 'warn' | 'error'

interface ShadowComparisonConfig<TPrimary, TShadow> {
  flowName: string
  endpoint: string
  method: string
  shadowMode: 'read' | 'write'
  primaryBackend: 'vil'
  shadowBackend: 'vil'
  requestSignature: unknown
  requestId: string
  primaryResult: {
    data: TPrimary | null
    error?: { message?: string | null; status?: number } | null
  }
  shadowRequest: () => Promise<{
    data: TShadow | null
    error?: { message?: string | null; status?: number } | null
  }>
  normalizePrimary?: (value: TPrimary | null) => unknown
  normalizeShadow?: (value: TShadow | null) => unknown
}

interface DivergenceEventPayload {
  request_id: string
  timestamp: string
  tenant_id: string | null
  user_id: string | null
  role: string | null
  flow_name: string
  endpoint: string
  method: string
  primary_backend: 'vil'
  shadow_backend: 'vil'
  normalized_request_signature: string
  result_hash_primary: string | null
  result_hash_shadow: string | null
  diff_summary: string
  severity: DivergenceSeverity
  primary_status?: number
  shadow_status?: number
  sampled_primary_payload?: unknown
  sampled_shadow_payload?: unknown
}

const DEFAULT_BASE_URL = import.meta.env.VITE_API_URL || ''
const SHADOW_MODE = import.meta.env.VITE_VIL_SHADOW_MODE || 'off'
const SHADOW_SAMPLE_RATE = Number(import.meta.env.VITE_VIL_SHADOW_SAMPLE_RATE || '1')
const INCLUDE_PAYLOAD = import.meta.env.VITE_VIL_SHADOW_INCLUDE_PAYLOAD === 'true'

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return 'null'

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (typeof value === 'object') {
    const object = value as JsonRecord
    const keys = Object.keys(object).sort()
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(object[key])}`).join(',')}}`
  }

  return JSON.stringify(value)
}

function hashString(input: string): string {
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, '0')
}

function normalizeUnknown(value: unknown): unknown {
  if (value === undefined) return null
  return value
}

function summaryFromValues(primary: unknown, shadow: unknown): string {
  if (stableStringify(primary) === stableStringify(shadow)) {
    return 'match'
  }

  if (Array.isArray(primary) && Array.isArray(shadow)) {
    return `array_mismatch primary=${primary.length} shadow=${shadow.length}`
  }

  if (primary && shadow && typeof primary === 'object' && typeof shadow === 'object') {
    const primaryKeys = Object.keys(primary as JsonRecord).sort()
    const shadowKeys = Object.keys(shadow as JsonRecord).sort()
    return `object_mismatch primary_keys=${primaryKeys.join('|')} shadow_keys=${shadowKeys.join('|')}`
  }

  return `value_mismatch primary_type=${typeof primary} shadow_type=${typeof shadow}`
}

function shouldRunShadow(mode: 'read' | 'write'): boolean {
  if (SHADOW_MODE === 'all') return true
  if (SHADOW_MODE === 'read' && mode === 'read') return true
  if (SHADOW_MODE === 'write' && mode === 'write') return true
  return false
}

function shouldSample(requestId: string): boolean {
  if (SHADOW_SAMPLE_RATE >= 1) return true
  if (SHADOW_SAMPLE_RATE <= 0) return false

  const sampleBucket = parseInt(hashString(requestId).slice(0, 4), 16) / 0xffff
  return sampleBucket <= SHADOW_SAMPLE_RATE
}

function buildActorContext(): {
  tenantId: string | null
  userId: string | null
  role: string | null
} {
  const session = readVilSession()
  return {
    tenantId:
      typeof session?.user?.user_metadata?.tenant_id === 'string'
        ? session.user.user_metadata.tenant_id
        : null,
    userId: session?.user?.id ?? null,
    role:
      typeof session?.user?.app_metadata?.role === 'string' ? session.user.app_metadata.role : null,
  }
}

export function createRequestId(): string {
  try {
    return `vil-${crypto.randomUUID()}`
  } catch {
    return `vil-${Math.random().toString(36).substring(2, 15)}`
  }
}

export function buildRequestHeaders(
  base: HeadersInit = {},
  options?: { withAuth?: boolean; requestId?: string }
): HeadersInit {
  const session = readVilSession()

  return {
    'Content-Type': 'application/json',
    ...(options?.withAuth && session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : {}),
    ...(options?.requestId ? { 'X-Request-Id': options.requestId } : {}),
    ...base,
  }
}

export async function runShadowComparison<TPrimary, TShadow>({
  flowName,
  endpoint,
  method,
  shadowMode,
  primaryBackend,
  shadowBackend,
  requestSignature,
  requestId,
  primaryResult,
  shadowRequest,
  normalizePrimary,
  normalizeShadow,
}: ShadowComparisonConfig<TPrimary, TShadow>): Promise<void> {
  if (!shouldRunShadow(shadowMode)) {
    return
  }

  if (!shouldSample(requestId)) {
    return
  }

  const actor = buildActorContext()
  const primaryValue = normalizeUnknown(
    normalizePrimary ? normalizePrimary(primaryResult.data) : primaryResult.data
  )

  try {
    const shadowResult = await shadowRequest()
    const shadowValue = normalizeUnknown(
      normalizeShadow ? normalizeShadow(shadowResult.data) : shadowResult.data
    )
    const diffSummary = summaryFromValues(primaryValue, shadowValue)
    const severity: DivergenceSeverity =
      diffSummary === 'match'
        ? 'info'
        : primaryResult.error || shadowResult.error
          ? 'error'
          : 'warn'

    const payload: DivergenceEventPayload = {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      role: actor.role,
      flow_name: flowName,
      endpoint,
      method,
      primary_backend: primaryBackend,
      shadow_backend: shadowBackend,
      normalized_request_signature: stableStringify(requestSignature),
      result_hash_primary: hashString(stableStringify(primaryValue)),
      result_hash_shadow: hashString(stableStringify(shadowValue)),
      diff_summary: diffSummary,
      severity,
      primary_status: primaryResult.error?.status,
      shadow_status: shadowResult.error?.status ?? undefined,
      ...(INCLUDE_PAYLOAD && diffSummary !== 'match'
        ? {
            sampled_primary_payload: primaryValue,
            sampled_shadow_payload: shadowValue,
          }
        : {}),
    }

    await fetch(`${DEFAULT_BASE_URL}/api/v1/internal/divergence-events`, {
      method: 'POST',
      headers: buildRequestHeaders({}, { withAuth: true, requestId }),
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'shadow_request_failed'
    const payload: DivergenceEventPayload = {
      request_id: requestId,
      timestamp: new Date().toISOString(),
      tenant_id: actor.tenantId,
      user_id: actor.userId,
      role: actor.role,
      flow_name: flowName,
      endpoint,
      method,
      primary_backend: primaryBackend,
      shadow_backend: shadowBackend,
      normalized_request_signature: stableStringify(requestSignature),
      result_hash_primary: hashString(stableStringify(primaryValue)),
      result_hash_shadow: null,
      diff_summary: message,
      severity: 'error',
      primary_status: primaryResult.error?.status,
      ...(INCLUDE_PAYLOAD
        ? {
            sampled_primary_payload: primaryValue,
          }
        : {}),
    }

    await fetch(`${DEFAULT_BASE_URL}/api/v1/internal/divergence-events`, {
      method: 'POST',
      headers: buildRequestHeaders({}, { withAuth: true, requestId }),
      body: JSON.stringify(payload),
    }).catch(() => undefined)
  }
}
