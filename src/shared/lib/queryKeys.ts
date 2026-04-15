/**
 * Centralized query key factory for multi-tenant cache isolation.
 *
 * RULE: Every React Query key MUST include tenantId as the second element.
 * This prevents cross-tenant cache collisions in a multi-tenant SaaS app.
 *
 * Usage:
 *   export const courseKeys = createQueryKeys('courses');
 *   // courseKeys.all(tenantId)           → ['courses', tenantId]
 *   // courseKeys.list(tenantId, filters) → ['courses', tenantId, 'list', filters]
 *   // courseKeys.detail(tenantId, id)    → ['courses', tenantId, 'detail', id]
 *
 * Custom extensions:
 *   export const lessonKeys = {
 *     ...createQueryKeys('lessons'),
 *     progress: (tenantId: string, userId: string) =>
 *       ['lessons', tenantId, 'progress', userId] as const,
 *   };
 */

/**
 * Creates a standardized query key factory for a feature domain.
 * All generated keys include tenantId for multi-tenant cache isolation.
 */
export function createQueryKeys<TScope extends string>(
  scope: TScope
): {
  all: (tenantId: string) => readonly [TScope, string]
  lists: (tenantId: string) => readonly [TScope, string, 'list']
  list: (
    tenantId: string,
    filters?: Record<string, unknown>
  ) => readonly [TScope, string, 'list', Record<string, unknown> | undefined]
  details: (tenantId: string) => readonly [TScope, string, 'detail']
  detail: (tenantId: string, id: string) => readonly [TScope, string, 'detail', string]
} {
  return {
    /** Root key for the entire feature scope: [scope, tenantId] */
    all: (tenantId: string) => [scope, tenantId] as const,

    /** List key with optional filters: [scope, tenantId, 'list', filters?] */
    lists: (tenantId: string) => [scope, tenantId, 'list'] as const,
    list: (tenantId: string, filters?: Record<string, unknown>) =>
      [scope, tenantId, 'list', filters] as const,

    /** Detail key for a single entity: [scope, tenantId, 'detail', id] */
    details: (tenantId: string) => [scope, tenantId, 'detail'] as const,
    detail: (tenantId: string, id: string) => [scope, tenantId, 'detail', id] as const,
  }
}
