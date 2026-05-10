// =============================================================================
// QuestionBankPoolConfig.tsx — Teacher UI for pool-mode configuration
//
// Phase 33A: Server-Side Question Bank Pool Randomization
// Allows teachers to attach question banks to a quiz and configure how many
// questions are drawn per attempt, with per-question point values.
// =============================================================================

import {
  AlertTriangle,
  BookOpen,
  Loader2,
  Plus,
  ShuffleIcon,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "@/hooks/useToast";

import {
  deletePoolConfig,
  getPoolConfigs,
  getQuestionBanks,
  type PoolConfig,
  type QuestionBankSummary,
  savePoolConfig,
} from "../../api/questionBankService";

// ─── Props ────────────────────────────────────────────────────────────────────

interface QuestionBankPoolConfigProps {
  quizId: string;
  tenantId: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuestionBankPoolConfig({
  quizId,
  tenantId,
}: QuestionBankPoolConfigProps) {
  const { addToast } = useToast();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [banks, setBanks] = useState<QuestionBankSummary[]>([]);
  const [poolConfigs, setPoolConfigs] = useState<PoolConfig[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = useState(true);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState(true);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedBankId, setSelectedBankId] = useState("");
  const [drawCount, setDrawCount] = useState(5);
  const [pointsPerQuestion, setPointsPerQuestion] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Load data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!tenantId) return;

    setIsLoadingBanks(true);
    getQuestionBanks(tenantId)
      .then((data) => setBanks(data))
      .catch(() =>
        addToast({ type: "error", message: "Gagal memuat daftar bank soal" }),
      )
      .finally(() => setIsLoadingBanks(false));
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!quizId || !tenantId) return;

    setIsLoadingConfigs(true);
    getPoolConfigs(quizId, tenantId)
      .then((data) => setPoolConfigs(data))
      .catch(() =>
        addToast({
          type: "error",
          message: "Gagal memuat konfigurasi pool soal",
        }),
      )
      .finally(() => setIsLoadingConfigs(false));
  }, [quizId, tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ─────────────────────────────────────────────────────────────────
  const isPoolMode = poolConfigs.length > 0;

  const alreadyConfiguredBankIds = new Set(poolConfigs.map((c) => c.bank_id));

  const availableBanks = banks.filter(
    (b) => !alreadyConfiguredBankIds.has(b.id),
  );

  const getBankName = (bankId: string): string =>
    banks.find((b) => b.id === bankId)?.title ?? "—";

  const getBankQuestionCount = (bankId: string): number =>
    banks.find((b) => b.id === bankId)?.question_count ?? 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!selectedBankId) {
      addToast({ type: "error", message: "Pilih bank soal terlebih dahulu" });
      return;
    }

    const bank = banks.find((b) => b.id === selectedBankId);
    if (bank && drawCount > bank.question_count) {
      addToast({
        type: "error",
        message: `Jumlah soal diambil (${drawCount}) melebihi jumlah soal di bank (${bank.question_count})`,
      });
      return;
    }

    if (drawCount < 1) {
      addToast({ type: "error", message: "Jumlah soal harus minimal 1" });
      return;
    }

    if (pointsPerQuestion < 1) {
      addToast({ type: "error", message: "Poin per soal harus minimal 1" });
      return;
    }

    setIsSaving(true);
    try {
      const saved = await savePoolConfig(
        {
          quizId,
          bankId: selectedBankId,
          drawCount,
          pointsPerQuestion,
        },
        tenantId,
      );

      setPoolConfigs((prev) => {
        const idx = prev.findIndex((c) => c.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });

      setSelectedBankId("");
      setDrawCount(5);
      setPointsPerQuestion(10);

      addToast({
        type: "success",
        message: "Bank soal berhasil ditambahkan ke pool",
      });
    } catch {
      addToast({
        type: "error",
        message: "Gagal menyimpan konfigurasi pool soal",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (configId: string) => {
    setDeletingId(configId);
    try {
      await deletePoolConfig(configId, tenantId);
      setPoolConfigs((prev) => prev.filter((c) => c.id !== configId));
      addToast({ type: "success", message: "Konfigurasi pool soal dihapus" });
    } catch {
      addToast({
        type: "error",
        message: "Gagal menghapus konfigurasi pool soal",
      });
    } finally {
      setDeletingId(null);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const isLoading = isLoadingBanks || isLoadingConfigs;

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-gray-700">
        <ShuffleIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Konfigurasi Pool Bank Soal
        </h3>
      </div>

      <div className="space-y-4 p-4">
        {/* Pool mode active badge */}
        {isPoolMode && (
          <div className="flex items-center gap-2 rounded-md bg-indigo-50 px-3 py-2 dark:bg-indigo-950">
            <AlertTriangle className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
              Mode Pool Aktif — soal dipilih secara acak dari bank saat
              percobaan dimulai
            </p>
          </div>
        )}

        {/* Skeleton while loading */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Configured pools list */}
            {poolConfigs.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-3 dark:bg-gray-800">
                <BookOpen className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Belum ada bank soal yang dikonfigurasi. Tambahkan bank soal di
                  bawah.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {poolConfigs.map((config) => {
                  const bankQCount = getBankQuestionCount(config.bank_id);
                  const isOverdrawn =
                    config.draw_count > bankQCount && bankQCount > 0;

                  return (
                    <div
                      key={config.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800"
                    >
                      {/* Bank info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {getBankName(config.bank_id)}
                        </p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Ambil{" "}
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                              {config.draw_count}
                            </span>{" "}
                            soal
                            {bankQCount > 0 && ` dari ${bankQCount}`}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {config.points_per_question} poin/soal
                          </span>
                          {isOverdrawn && (
                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                              ⚠ Melebihi jumlah soal di bank
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={() => handleDelete(config.id)}
                        disabled={deletingId === config.id}
                        className="shrink-0 rounded p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950 dark:hover:text-red-400"
                        aria-label="Hapus konfigurasi pool"
                        title="Hapus"
                      >
                        {deletingId === config.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add bank form */}
            {availableBanks.length > 0 && (
              <div className="rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-600">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Tambah Bank Soal
                </p>

                <div className="space-y-2">
                  {/* Bank dropdown */}
                  <select
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    aria-label="Pilih bank soal"
                  >
                    <option value="">— Pilih bank soal —</option>
                    {availableBanks.map((bank) => (
                      <option key={bank.id} value={bank.id}>
                        {bank.title} ({bank.question_count} soal)
                      </option>
                    ))}
                  </select>

                  {/* Draw count + points row */}
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label
                        htmlFor="pool-draw-count"
                        className="mb-1 block text-xs text-gray-600 dark:text-gray-400"
                      >
                        Jumlah soal diambil
                      </label>
                      <input
                        id="pool-draw-count"
                        type="number"
                        min={1}
                        max={
                          selectedBankId
                            ? (banks.find((b) => b.id === selectedBankId)
                                ?.question_count ?? 999)
                            : 999
                        }
                        value={drawCount}
                        onChange={(e) =>
                          setDrawCount(Math.max(1, Number(e.target.value)))
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="pool-points-per-question"
                        className="mb-1 block text-xs text-gray-600 dark:text-gray-400"
                      >
                        Poin per soal
                      </label>
                      <input
                        id="pool-points-per-question"
                        type="number"
                        min={1}
                        value={pointsPerQuestion}
                        onChange={(e) =>
                          setPointsPerQuestion(
                            Math.max(1, Number(e.target.value)),
                          )
                        }
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </div>
                  </div>

                  {/* Add button */}
                  <button
                    onClick={handleAdd}
                    disabled={isSaving || !selectedBankId}
                    className="flex w-full items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan…
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Tambah ke Pool
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* All banks already configured */}
            {availableBanks.length === 0 &&
              banks.length > 0 &&
              poolConfigs.length > 0 && (
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  Semua bank soal yang tersedia sudah dikonfigurasi.
                </p>
              )}

            {/* No banks exist at all */}
            {banks.length === 0 && (
              <div className="rounded-md bg-amber-50 px-3 py-2 dark:bg-amber-950">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Belum ada bank soal. Buat bank soal terlebih dahulu di menu
                  Bank Soal.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
