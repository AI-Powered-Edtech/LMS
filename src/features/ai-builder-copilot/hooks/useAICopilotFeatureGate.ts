import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { isFeatureEnabled, loadFeatureFlags } from "@/utils/featureFlags";

/**
 * Returns whether the AI Course Builder Copilot feature is enabled
 * for the current tenant/user. Waits for feature flags to hydrate
 * before returning a definitive answer (prevents flash of ungated UI).
 */
export function useAICopilotFeatureGate(): {
  enabled: boolean;
  loading: boolean;
} {
  const { tenantId, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      try {
        await loadFeatureFlags();
      } catch {
        // Fail closed — flag disabled if we can't load
      }
      if (!cancelled) {
        setEnabled(
          isFeatureEnabled(
            "ai_course_builder_copilot",
            tenantId ?? undefined,
            user?.id,
          ),
        );
        setLoading(false);
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [tenantId, user?.id]);

  return { enabled, loading };
}
