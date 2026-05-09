import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/hooks/useToast";

import { listMFAFactors, verifyMFAChallenge } from "../api/mfaService";

export function MFAVerifyPage() {
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) return;
    setLoading(true);
    setError(null);

    const factors = await listMFAFactors();
    const totpFactor = factors.find(
      (f) => f.factor_type === "totp" && f.status === "verified",
    );

    if (!totpFactor) {
      setError(t("auth.pages.mfaNoFactorError"));
      addToast({ type: "error", message: t("auth.pages.mfaNoFactorToast") });
      setLoading(false);
      return;
    }

    const success = await verifyMFAChallenge(totpFactor.id, verificationCode);
    if (success) {
      addToast({
        type: "success",
        message: t("auth.pages.mfaVerifySuccessToast"),
      });
      window.location.assign("/app/student/dashboard");
    } else {
      setError(t("auth.pages.mfaInvalidCodeError"));
      addToast({ type: "error", message: t("auth.pages.mfaInvalidCodeToast") });
    }
    setLoading(false);
  }, [verificationCode, addToast, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {t("auth.pages.mfaVerifyTitle")}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t("auth.pages.mfaVerifyDescription")}
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label={t("auth.pages.mfaVerificationCode")}
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={verificationCode}
            onChange={(e) =>
              setVerificationCode(e.target.value.replace(/\D/g, ""))
            }
            placeholder="123456"
            aria-label={t("auth.pages.mfaAuthenticatorCodeAria")}
            autoFocus
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <Button
            onClick={handleVerify}
            disabled={loading || verificationCode.length !== 6}
            fullWidth
          >
            {loading ? <Spinner size="sm" /> : t("auth.pages.verify")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
