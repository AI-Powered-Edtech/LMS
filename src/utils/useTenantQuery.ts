import { useCallback } from 'react'

import { supabase } from '@/src/services/supabase/client'

import { useAuth } from '../contexts/AuthContext'

/**
 * useTenantQuery — defense-in-depth helper for tenant-scoped queries.
 *
 * RLS already enforces tenant isolation at the DB level, so these helpers
 * are an additional safety layer. They automatically append
 * `.eq('tenant_id', tenantId)` to queries and include `tenant_id` in inserts.
 *
 * Usage:
 *   const { tenantQuery, tenantInsert } = useTenantQuery();
 *
 *   // SELECT with automatic tenant filter
 *   const { data } = await tenantQuery('classes').select('id, name, created_at');
 *
 *   // INSERT with automatic tenant_id
 *   await tenantInsert('classes', { name: 'English 101', teacher_id: userId });
 */
export function useTenantQuery() {
  const { tenantId } = useAuth()

  /**
   * Returns a Supabase query builder pre-filtered by tenant_id.
   * Caller must chain `.select('col1, col2, ...')` to specify columns.
   * Falls back to an unfiltered query if tenantId is not available
   * (RLS will still enforce isolation).
   */
  const tenantQuery = useCallback(
    (table: string, columns = 'id') => {
      const query = supabase.from(table)
      if (tenantId) {
        return query.select(columns).eq('tenant_id', tenantId)
      }
      return query.select(columns)
    },
    [tenantId]
  )

  /**
   * Inserts a record with tenant_id automatically added.
   * The auto_set_tenant_id trigger also provides a DB-level fallback.
   */
  const tenantInsert = useCallback(
    async (table: string, data: Record<string, unknown>) => {
      const record = tenantId ? { ...data, tenant_id: tenantId } : data
      return supabase.from(table).insert(record)
    },
    [tenantId]
  )

  return { tenantId, tenantQuery, tenantInsert }
}
