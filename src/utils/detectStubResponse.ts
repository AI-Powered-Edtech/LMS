import { useToast } from '@/hooks/useToast'

/**
 * Several backend endpoints (PDF reports, plagiarism, etc.) are mounted as
 * stubs (`edusync-api/crates/api-server/src/stub_handlers.rs`) until their
 * proper implementations land in later phases. Stubs always include
 * `stub: true` in the JSON payload.
 *
 * Call this on any response body that came from a known-stub endpoint so the
 * user sees an explicit "feature in development" toast instead of a silent
 * no-op or fake success. Safe to call on real (non-stub) responses — it only
 * fires when `stub === true`.
 *
 * Per `docs/school-os-blueprint/03-gap-analysis.md` §C orphan audit (Prio 1
 * Unit 3 decision): rather than hide every UI surface that calls a stub, we
 * surface the truth at the boundary.
 */
export function detectStubResponse(payload: unknown, featureLabel: string): boolean {
  if (typeof payload !== 'object' || payload === null) return false
  const isStub = (payload as { stub?: unknown }).stub === true
  if (!isStub) return false
  useToast.getState().addToast({
    type: 'info',
    message: `${featureLabel} sedang dikembangkan`,
    description: 'Backend masih mengembalikan data placeholder. Fitur penuh akan tersedia di fase berikutnya.',
  })
  return true
}
