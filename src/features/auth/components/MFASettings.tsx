import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";

import type { MFAFactor } from "../api/mfaService";
import { listMFAFactors, unenrollMFA } from "../api/mfaService";

export function MFASettings() {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [factors, setFactors] = useState<MFAFactor[]>([]);

  const loadFactors = useCallback(async () => {
    const result = await listMFAFactors();
    setFactors(result);
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const handleDisable = useCallback(async () => {
    const totpFactor = factors.find((f) => f.factor_type === "totp");
    if (!totpFactor) return;

    const success = await unenrollMFA(totpFactor.id);
    if (success) {
      addToast({
        type: "success",
        message: t("auth.pages.mfaDisableSuccessToast"),
      });
      void loadFactors();
    } else {
      addToast({
        type: "error",
        message: t("auth.pages.mfaDisableErrorToast"),
      });
    }
  }, [factors, addToast, loadFactors, t]);

  const isMFAEnabled = factors.some((f) => f.status === "verified");

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">
            {t("auth.pages.mfaVerifyTitle")}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isMFAEnabled
              ? t("auth.pages.mfaEnabledDescription")
              : t("auth.pages.mfaDisabledDescription")}
          </p>
        </div>
        <Badge variant={isMFAEnabled ? "success" : "warning"}>
          {isMFAEnabled ? t("auth.pages.active") : t("auth.pages.inactive")}
        </Badge>
      </div>

      {isMFAEnabled && (
        <Button variant="secondary" onClick={handleDisable}>
          {t("auth.pages.mfaDisable")}
        </Button>
      )}

      {!isMFAEnabled && (
        <a href="/setup-2fa">
          <Button>{t("auth.pages.mfaEnable")}</Button>
        </a>
      )}
    </Card>
  );
}
