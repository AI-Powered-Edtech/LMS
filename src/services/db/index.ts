/**
 * VIL database client — EduSync LMS
 *
 * Drop-in replacement for @db/db-js removed in Phase 6.
 * Routes .from() / .rpc() through VIL PostgREST-compatible API,
 * .auth through VIL AuthProvider, .storage through VIL StorageProvider.
 *
 * All consumer files import: import { db } from '@/services/db'
 */

import { getActiveApiClient } from '@/services/api/runtime'
import { getAuthProvider } from '@/services/auth'
import { getRealtimeProvider } from '@/services/realtime'
import { getStorageProvider } from '@/services/storage'
import { logger } from '@/utils/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db: any = {
  from(table: string) {
    const client = getActiveApiClient()
    if (!client)
      throw new Error(
        `[VIL] API client not initialized. Call setActiveApiClient() before using db.from('${table}').`
      )
    return client.from(table)
  },
  rpc(fn: string, args?: Record<string, unknown>) {
    const client = getActiveApiClient()
    if (!client)
      throw new Error(
        `[VIL] API client not initialized. Call setActiveApiClient() before using db.rpc('${fn}').`
      )
    return client.rpc(fn, args)
  },
  get auth() {
    return getAuthProvider()
  },
  get storage() {
    return getStorageProvider()
  },
  channel(name: string, options?: unknown) {
    return getRealtimeProvider().channel(name, options as never)
  },
  removeChannel(channel: unknown) {
    return getRealtimeProvider().removeChannel(channel as never)
  },
  removeAllChannels() {
    return getRealtimeProvider().removeAllChannels()
  },
  functions: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoke(fnName: string, _options?: any): Promise<{ data: null; error: Error }> {
      const msg = `[VIL] Edge Function '${fnName}' removed. Use fetch('/api/v1/...') instead.`
      logger.error(msg)
      return Promise.resolve({ data: null, error: new Error(msg) })
    },
  },
}

// Backward-compat helpers (no-ops)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getDbClient(): any {
  return db
}
export function initializeDbClient(): void {}
export function setDbClient(_client: unknown): void {}
