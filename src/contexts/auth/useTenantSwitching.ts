import { useCallback, useEffect, useState } from "react";

import { logger } from "@/utils/logger";
import { addBreadcrumb } from "@/utils/sentry";

import type { Tenant } from "./useRoleResolution";

interface UseTenantSwitchingParams {
  rawTenants: Record<string, Tenant>;
  defaultTenantId?: string | null;
}

interface UseTenantSwitchingResult {
  tenantId: string | null;
  activeTenant: Tenant | null;
  setActiveTenant: (id: string) => void;
}

/**
 * Hook untuk mengelola multi-tenant switching.
 * Menyimpan tenant_id di localStorage sebagai hint — divalidasi terhadap server.
 */
export function useTenantSwitching({
  rawTenants,
  defaultTenantId = null,
}: UseTenantSwitchingParams): UseTenantSwitchingResult {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [activeTenant, setActiveTenantState] = useState<Tenant | null>(null);

  useEffect(() => {
    const savedTenantId = localStorage.getItem("activeTenantId");
    if (savedTenantId) {
      setTenantId(savedTenantId);
    }
  }, []);

  useEffect(() => {
    if (Object.keys(rawTenants).length === 0) {
      setActiveTenantState(null);
      if (!localStorage.getItem("activeTenantId")) {
        setTenantId(null);
      }
    }
  }, [rawTenants]);

  useEffect(() => {
    if (!tenantId && defaultTenantId) {
      setTenantId(defaultTenantId);
      localStorage.setItem("activeTenantId", defaultTenantId);
    }
  }, [defaultTenantId, tenantId]);

  // Restore activeTenant from rawTenants when both are available (e.g., after page reload)
  useEffect(() => {
    if (!activeTenant && tenantId && rawTenants[tenantId]) {
      const tenant = rawTenants[tenantId];
      if (tenant.is_active) {
        setActiveTenantState(tenant);
      }
    }
  }, [tenantId, rawTenants, activeTenant]);

  useEffect(() => {
    if (
      !tenantId &&
      defaultTenantId &&
      rawTenants[defaultTenantId]?.is_active
    ) {
      setActiveTenantState(rawTenants[defaultTenantId]);
      setTenantId(defaultTenantId);
      return;
    }

    if (
      tenantId &&
      !rawTenants[tenantId] &&
      defaultTenantId &&
      rawTenants[defaultTenantId]?.is_active
    ) {
      localStorage.setItem("activeTenantId", defaultTenantId);
      setActiveTenantState(rawTenants[defaultTenantId]);
      setTenantId(defaultTenantId);
    }
  }, [defaultTenantId, rawTenants, tenantId]);

  const setActiveTenant = useCallback(
    (id: string) => {
      localStorage.setItem("activeTenantId", id);
      const tenant = rawTenants[id];
      if (tenant) {
        if (!tenant.is_active) {
          if (import.meta.env.DEV)
            logger.warn(
              `[Auth] Attempted to switch to inactive tenant ${id} — blocked`,
            );
          localStorage.removeItem("activeTenantId");
          return;
        }
        addBreadcrumb("Tenant switched", "auth", {
          tenantId: id,
          tenantName: tenant.name,
        });
        setActiveTenantState(tenant);
        setTenantId(id);
      } else {
        if (import.meta.env.DEV)
          logger.warn(
            `Tenant with id ${id} not found in rawTenants - will validate on next auth`,
          );
      }
    },
    [rawTenants],
  );

  return { tenantId, activeTenant, setActiveTenant };
}
