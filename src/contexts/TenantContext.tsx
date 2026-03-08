import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
}

interface TenantContextType {
    tenantId: string | null;
    tenant: Tenant | null;
    loading: boolean;
    error: string | null;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
    const { user, session } = useAuth();
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [tenant, setTenant] = useState<Tenant | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user || !session) {
            setTenantId(null);
            setTenant(null);
            setLoading(false);
            return;
        }

        const resolveTenant = async () => {
            setLoading(true);
            setError(null);

            try {
                // 1. Try to read tenant_id from JWT claims (fastest, no DB call)
                let resolvedTenantId: string | null = null;

                try {
                    const payload = JSON.parse(atob(session.access_token.split('.')[1]));
                    if (payload.tenant_id) {
                        resolvedTenantId = payload.tenant_id;
                    }
                } catch {
                    // JWT decode failed, fall back to DB lookup
                }

                // 2. Fallback: query the profile directly
                if (!resolvedTenantId) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('tenant_id')
                        .eq('id', user.id)
                        .single();

                    resolvedTenantId = profile?.tenant_id ?? null;
                }

                setTenantId(resolvedTenantId);

                // 3. Fetch full tenant record
                if (resolvedTenantId) {
                    const { data: tenantData, error: tenantErr } = await supabase
                        .from('tenants')
                        .select('id, name, slug, is_active')
                        .eq('id', resolvedTenantId)
                        .single();

                    if (tenantErr) throw tenantErr;
                    setTenant(tenantData);
                }
            } catch (err: any) {
                console.error('Error resolving tenant:', err);
                setError(err.message ?? 'Failed to resolve tenant');
            } finally {
                setLoading(false);
            }
        };

        resolveTenant();
    }, [user, session]);

    return (
        <TenantContext.Provider value={{ tenantId, tenant, loading, error }}>
            {children}
        </TenantContext.Provider>
    );
}

export function useTenant() {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
}
