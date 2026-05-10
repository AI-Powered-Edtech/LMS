// ==========================================================================
// DigestSettings — Pengaturan Notifikasi Harian
// Wave 4 — Task 29.4 (Mobile-first)
// ==========================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import type { DigestChannel } from "@/features/notifications/api/digestApi";
import {
  getDigestSettings,
  updateDigestSettings,
} from "@/features/notifications/api/digestApi";
import { cn } from "@/utils/cn";

// ── Constants ─────────────────────────────────────────────────────────────

const CHANNEL_OPTIONS: {
  value: DigestChannel;
  label: string;
  description: string;
  badge?: string;
}[] = [
  {
    value: "inapp",
    label: "Notifikasi Aplikasi",
    description: "Terima ringkasan di dalam aplikasi",
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    description: "Kirim ke WhatsApp (dalam pengembangan)",
    badge: "Beta",
  },
  {
    value: "email",
    label: "Email",
    description: "Kirim ringkasan ke email Anda (dalam pengembangan)",
    badge: "Beta",
  },
];

const TIME_OPTIONS = [
  { value: "07:00", label: "07:00 WIB — Pagi" },
  { value: "12:00", label: "12:00 WIB — Siang" },
  { value: "15:00", label: "15:00 WIB — Sore awal" },
  { value: "17:00", label: "17:00 WIB — Sore (default)" },
  { value: "19:00", label: "19:00 WIB — Malam" },
  { value: "20:00", label: "20:00 WIB — Malam akhir" },
];

// ── Preview Component ──────────────────────────────────────────────────────

function DigestPreview({ childName }: { childName: string }) {
  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div
      className="rounded-2xl border border-slate-200 dark:border-slate-700
                 bg-slate-50 dark:bg-slate-800/50 p-4"
    >
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
        Contoh Laporan
      </p>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Laporan Harian {childName} — {today}
        </p>
        <div className="space-y-1.5 pl-1">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            ✅ Hadir di sekolah hari ini
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            📚 2 pelajaran selesai hari ini
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            📝 1 tugas dikumpulkan
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            ⚠️ 1 tugas hampir tenggat waktu
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Toggle Switch ──────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
        checked ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-600",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────

export function DigestSettings() {
  const { user, tenantId } = useAuth();
  const queryClient = useQueryClient();

  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestTime, setDigestTime] = useState("17:00");
  const [channel, setChannel] = useState<DigestChannel>("inapp");
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch existing settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["parent", "digest-settings", user?.id ?? ""],
    queryFn: () => getDigestSettings(user!.id),
    enabled: !!user?.id,
  });

  // Sync state saat data loaded
  useEffect(() => {
    if (settings) {
      setDigestEnabled(settings.digest_enabled);
      setDigestTime(settings.digest_time?.slice(0, 5) ?? "17:00");
      setChannel(settings.channel);
    }
  }, [settings]);

  // Save mutation
  const { mutate: saveSettings, isPending: isSaving } = useMutation({
    mutationFn: () =>
      updateDigestSettings(user!.id, tenantId!, {
        digest_enabled: digestEnabled,
        digest_time: digestTime,
        channel,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["parent", "digest-settings", user?.id ?? ""],
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const isDirty =
    settings === null ||
    settings === undefined ||
    settings.digest_enabled !== digestEnabled ||
    (settings.digest_time?.slice(0, 5) ?? "17:00") !== digestTime ||
    settings.channel !== channel;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          Notifikasi Harian
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Terima ringkasan perkembangan anak setiap hari
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Toggle Aktifkan */}
          <div
            className="flex items-center justify-between gap-3 p-4
                       rounded-2xl bg-white dark:bg-slate-800
                       border border-slate-200 dark:border-slate-700"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Aktifkan Laporan Harian
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Dapatkan ringkasan aktivitas anak setiap hari
              </p>
            </div>
            <Toggle checked={digestEnabled} onChange={setDigestEnabled} />
          </div>

          {/* Waktu Pengiriman */}
          <div
            className={cn(
              "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
              !digestEnabled && "opacity-50 pointer-events-none",
            )}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Waktu Pengiriman
            </p>
            <select
              value={digestTime}
              onChange={(e) => setDigestTime(e.target.value)}
              disabled={!digestEnabled}
              className={cn(
                "w-full rounded-xl border border-slate-200 dark:border-slate-600",
                "bg-slate-50 dark:bg-slate-700/50",
                "text-sm text-slate-900 dark:text-slate-100",
                "px-3 py-2.5 min-h-[44px]",
                "focus:outline-none focus:ring-2 focus:ring-blue-500",
                "disabled:opacity-50",
              )}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Channel */}
          <div
            className={cn(
              "p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700",
              !digestEnabled && "opacity-50 pointer-events-none",
            )}
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Kirim Via
            </p>
            <div className="space-y-2">
              {CHANNEL_OPTIONS.map((opt) => {
                const isComingSoon = opt.value !== "inapp";
                const isSelected = channel === opt.value;

                return (
                  <button
                    key={opt.value}
                    onClick={() => !isComingSoon && setChannel(opt.value)}
                    disabled={isComingSoon || !digestEnabled}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors",
                      "border focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      isSelected && !isComingSoon
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/30",
                      isComingSoon && "cursor-not-allowed",
                      !isComingSoon && !digestEnabled && "opacity-50",
                    )}
                  >
                    {/* Radio indicator */}
                    <div
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                        isSelected && !isComingSoon
                          ? "border-blue-500"
                          : "border-slate-300 dark:border-slate-500",
                      )}
                    >
                      {isSelected && !isComingSoon && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "text-sm font-medium",
                            isComingSoon
                              ? "text-slate-400 dark:text-slate-500"
                              : "text-slate-900 dark:text-slate-100",
                          )}
                        >
                          {opt.label}
                        </p>
                        {opt.badge && (
                          <span
                            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                                       bg-amber-100 dark:bg-amber-900/30
                                       text-amber-700 dark:text-amber-400"
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview */}
          {digestEnabled && <DigestPreview childName="Anak" />}

          {/* Save button */}
          <button
            onClick={() => saveSettings()}
            disabled={isSaving || !isDirty}
            className={cn(
              "w-full min-h-[48px] rounded-2xl font-semibold text-sm transition-all",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
              saveSuccess
                ? "bg-green-600 text-white"
                : isDirty && !isSaving
                  ? "bg-blue-600 text-white active:bg-blue-700"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed",
            )}
          >
            {isSaving
              ? "Menyimpan..."
              : saveSuccess
                ? "✓ Tersimpan"
                : "Simpan Pengaturan"}
          </button>

          {/* Last sent info */}
          {settings?.last_sent_at && (
            <p className="text-center text-xs text-slate-400 dark:text-slate-600">
              Terakhir dikirim:{" "}
              {new Date(settings.last_sent_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
