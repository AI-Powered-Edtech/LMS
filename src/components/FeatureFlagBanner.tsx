import { AlertTriangle } from "lucide-react";

export interface FeatureFlagBannerProps {
  /** Internal feature key, e.g. "reports.export" - used for analytics/telemetry. */
  feature: string;
  /** Optional override message (plaintext). Defaults to Indonesian dev message. */
  message?: string;
  /** Optional href for "learn more" link. */
  helpUrl?: string;
}

/**
 * Banner ditampilkan di atas fitur yang masih dalam pengembangan (BE-stub).
 *
 * Mencegah user menunggu hasil yang tidak akan datang — menjaga trust signal.
 * Dipakai di fitur yang BE-nya masih stub (mis. reports/export async) sampai
 * handler real dimigrasi dari axum-style ke VIL-style (audit §11).
 *
 * Dampak UX:
 * - User tahu dari awal bahwa hasil mungkin tidak final/akurat.
 * - Tidak menunggu progress yang stuck di backend stub.
 * - Tidak hubungi support karena confusing UX.
 */
export function FeatureFlagBanner({
  feature,
  message = "Fitur ini masih dalam pengembangan. Hasil yang ditampilkan mungkin belum final atau akurat.",
  helpUrl,
}: FeatureFlagBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-feature={feature}
      className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertTriangle
        className="mt-0.5 h-5 w-5 flex-shrink-0"
        aria-hidden="true"
      />
      <div className="flex-1 text-sm">
        <p className="font-medium">{message}</p>
        {helpUrl ? (
          <p className="mt-1">
            <a
              href={helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:no-underline"
            >
              Pelajari lebih lanjut
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default FeatureFlagBanner;
