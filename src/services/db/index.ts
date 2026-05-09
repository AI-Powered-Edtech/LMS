/**
 * VIL database client — EduSync LMS
 *
 * Drop-in replacement for @db/db-js removed in Phase 6.
 * Routes .from() / .rpc() through VIL PostgREST-compatible API,
 * .auth through VIL AuthProvider, .storage through VIL StorageProvider.
 *
 * All consumer files import: import { db } from '@/services/db'
 */

import { getActiveApiClient } from "@/services/api/runtime";
import type {
  ApiClient,
  ApiQueryBuilder,
  ApiQueryResult,
} from "@/services/api/types";
import type { AuthProvider } from "@/services/auth";
import { getAuthProvider } from "@/services/auth";
import type { RealtimeProvider } from "@/services/realtime";
import { getRealtimeProvider } from "@/services/realtime";
import type { StorageProvider } from "@/services/storage";
import { getStorageProvider } from "@/services/storage";
import { logger } from "@/utils/logger";

export type DbFacade = {
  from: <T = unknown>(table: string) => ApiQueryBuilder<T>;
  rpc: <T = unknown>(
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<ApiQueryResult<T>>;
  readonly auth: AuthProvider;
  readonly storage: StorageProvider;
  channel: RealtimeProvider["channel"];
  removeChannel: RealtimeProvider["removeChannel"];
  removeAllChannels: RealtimeProvider["removeAllChannels"];
  functions: {
    invoke(
      fnName: string,
      options?: { body?: unknown },
    ): Promise<{ data: null; error: Error }>;
  };
};

export const db: DbFacade = {
  from<T = unknown>(table: string) {
    const client = getActiveApiClient() as ApiClient;
    if (!client)
      throw new Error(
        `[VIL] API client not initialized. Call setActiveApiClient() before using db.from('${table}').`,
      );
    return client.from<T>(table);
  },
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>) {
    const client = getActiveApiClient() as ApiClient;
    if (!client)
      throw new Error(
        `[VIL] API client not initialized. Call setActiveApiClient() before using db.rpc('${fn}').`,
      );
    return client.rpc<T>(fn, args);
  },
  get auth() {
    return getAuthProvider();
  },
  get storage() {
    return getStorageProvider();
  },
  channel(name: string, options?: unknown) {
    return getRealtimeProvider().channel(name, options as never);
  },
  removeChannel(channel: unknown) {
    return getRealtimeProvider().removeChannel(channel as never);
  },
  removeAllChannels() {
    return getRealtimeProvider().removeAllChannels();
  },
  functions: {
    invoke(
      fnName: string,
      _options?: { body?: unknown },
    ): Promise<{ data: null; error: Error }> {
      const msg = `[VIL] Edge Function '${fnName}' removed. Use the VIL API client or a typed service wrapper instead.`;
      logger.error(msg);
      return Promise.resolve({ data: null, error: new Error(msg) });
    },
  },
};

// Backward-compat helpers (no-ops)
export function getDbClient(): DbFacade {
  return db;
}
export function initializeDbClient(): void {}
export function setDbClient(_client: unknown): void {}
