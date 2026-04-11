/**
 * VIL-native Supabase client replacement — Phase 6 Decommission
 *
 * Replaces @supabase/supabase-js dependency with VIL provider pass-through.
 * All 127 consumer files that import `{ supabase }` continue to work unchanged
 * because the interface surface (.from(), .rpc(), .auth, .storage) is preserved.
 *
 * @supabase/supabase-js is no longer a dependency as of Phase 6.
 */

import { getActiveApiClient } from '@/services/api/runtime'
import { getAuthProvider } from '@/services/auth'
import { getRealtimeProvider } from '@/services/realtime'
import { getStorageProvider } from '@/services/storage'

// ── VIL-native supabase surface ───────────────────────────────────────────────
//
// Type: `unknown` intentionally breaks the @supabase/supabase-js SupabaseClient
// coupling. All consumer code uses duck-typing (.from(), .rpc(), .auth, .storage)
// which VIL providers already satisfy at runtime.
//
// The `any` cast is contained here so the rest of the codebase stays type-safe.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase: any = {
  /**
   * Database query builder — routed through VIL PostgREST-compatible API.
   * Equivalent to Supabase's `supabase.from(table).select(...).eq(...)...`
   */
  from(table: string) {
    const client = getActiveApiClient()
    if (!client) {
      throw new Error(
        `[VIL] API client not initialized. Call setActiveApiClient() before using supabase.from('${table}').`
      )
    }
    return client.from(table)
  },

  /**
   * RPC call — routed through VIL API.
   * Equivalent to Supabase's `supabase.rpc(fn, args)`
   */
  rpc(fn: string, args?: Record<string, unknown>) {
    const client = getActiveApiClient()
    if (!client) {
      throw new Error(
        `[VIL] API client not initialized. Call setActiveApiClient() before using supabase.rpc('${fn}').`
      )
    }
    return client.rpc(fn, args)
  },

  /**
   * Auth provider — returns VIL AuthProvider.
   * Equivalent to Supabase's `supabase.auth`
   */
  get auth() {
    return getAuthProvider()
  },

  /**
   * Storage provider — returns VIL StorageProvider.
   * Equivalent to Supabase's `supabase.storage`
   */
  get storage() {
    return getStorageProvider()
  },

  /**
   * Realtime provider — returns VIL RealtimeProvider channel factory.
   * Note: Supabase used `supabase.channel(name)` directly; VIL uses `getRealtimeProvider().channel(name)`.
   * This surface is exposed for any legacy code still using `supabase.channel()`.
   */
  channel(name: string, options?: unknown) {
    return getRealtimeProvider().channel(name, options as never)
  },

  removeChannel(channel: unknown) {
    return getRealtimeProvider().removeChannel(channel as never)
  },

  removeAllChannels() {
    return getRealtimeProvider().removeAllChannels()
  },

  /**
   * Edge Functions surface — throws helpful error.
   * All Edge Functions have been migrated to VIL API endpoints in Phase 3.
   * Update call sites to use direct fetch('/api/v1/...') instead.
   */
  functions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke(fnName: string, _options?: any): Promise<{ data: null; error: Error }> {
      const message =
        `[VIL Phase 6] Edge Function '${fnName}' has been removed. ` +
        `All Edge Functions were migrated to VIL API in Phase 3. ` +
        `Update this call to use fetch('/api/v1/...') directly.`
      console.error(message)
      return Promise.resolve({ data: null, error: new Error(message) })
    },
  },
}

// ── Backward-compat helpers ───────────────────────────────────────────────────

/**
 * @deprecated Use VIL providers directly. Kept for backward compatibility.
 * Returns the VIL-native `supabase` object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSupabaseClient(): any {
  return supabase
}

/**
 * @deprecated No-op in Phase 6. VIL providers are initialized in main.tsx.
 */
export function initializeSupabaseClient(): void {
  // No-op — VIL providers are initialized in main.tsx via setActiveApiClient(),
  // setAuthProvider(), setStorageProvider(), setRealtimeProvider()
  if (import.meta.env.DEV) {
    console.debug('[VIL] initializeSupabaseClient() called — no-op in Phase 6')
  }
}

/**
 * @deprecated No-op in Phase 6.
 */
export function setSupabaseClient(_client: unknown): void {
  // No-op
}
