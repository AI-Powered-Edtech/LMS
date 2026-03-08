import { supabase } from '../lib/supabase';
import { useTenant } from '../contexts/TenantContext';
import { useCallback } from 'react';

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
 *   const { data } = await tenantQuery('classes').select('*');
 *
 *   // INSERT with automatic tenant_id
 *   await tenantInsert('classes', { name: 'English 101', teacher_id: userId });
 */
export function useTenantQuery() {
    const { tenantId } = useTenant();

    /**
     * Returns a Supabase query builder pre-filtered by tenant_id.
     * Falls back to an unfiltered query if tenantId is not available
     * (RLS will still enforce isolation).
     */
    const tenantQuery = useCallback(
        (table: string) => {
            const query = supabase.from(table);
            if (tenantId) {
                return query.select('*').eq('tenant_id', tenantId);
            }
            return query.select('*');
        },
        [tenantId]
    );

    /**
     * Inserts a record with tenant_id automatically added.
     * The auto_set_tenant_id trigger also provides a DB-level fallback.
     */
    const tenantInsert = useCallback(
        async (table: string, data: Record<string, any>) => {
            const record = tenantId ? { ...data, tenant_id: tenantId } : data;
            return supabase.from(table).insert(record);
        },
        [tenantId]
    );

    return { tenantId, tenantQuery, tenantInsert };
}
