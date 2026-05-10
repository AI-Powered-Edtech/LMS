/**
 * BulkImportWizard.tsx — Wizard impor massal pengguna via CSV.
 *
 * Steps:
 *  1. Template  — extracted to BulkImportUploadStep
 *  2. Upload    — extracted to BulkImportPreviewStep
 *  3. Validasi  — extracted to BulkImportPreviewStep
 *  4. Proses    — extracted to BulkImportProgressStep + BulkImportResultStep
 */

import { CheckCircle2, X } from "lucide-react";
import Papa from "papaparse";
import { useCallback, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import type { BulkImportRow as BulkImportRowType } from "../api/bulkImportService";
import {
  type BulkImportRow,
  createImportJob,
  getImportJobRows,
  getImportJobStatus,
  runBulkImport,
} from "../api/bulkImportService";
import { BulkImportPreviewStep } from "./bulk-import/BulkImportPreviewStep";
import { BulkImportProgressStep } from "./bulk-import/BulkImportProgressStep";
import { BulkImportResultStep } from "./bulk-import/BulkImportResultStep";
import { BulkImportUploadStep } from "./bulk-import/BulkImportUploadStep";

interface ParsedRow extends BulkImportRowType {
  _rowIndex: number;
  _errors: string[];
  _valid: boolean;
}

interface ImportResultRow extends BulkImportRowType {
  _rowIndex: number;
  status: "berhasil" | "gagal";
  reason?: string;
}

interface BulkImportWizardProps {
  onClose: () => void;
  onSuccess?: () => void;
}

const STEPS = [
  { id: 1, label: "Template" },
  { id: 2, label: "Upload" },
  { id: 3, label: "Validasi" },
  { id: 4, label: "Proses" },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                current === step.id
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                  : current > step.id
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400",
              )}
            >
              {current > step.id ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                step.id
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                current === step.id
                  ? "text-blue-600 dark:text-blue-400"
                  : current > step.id
                    ? "text-emerald-500"
                    : "text-slate-400 dark:text-slate-500",
              )}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-1 mb-5 transition-all",
                current > step.id
                  ? "bg-emerald-500"
                  : "bg-slate-200 dark:bg-slate-700",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function BulkImportWizard({
  onClose,
  onSuccess,
}: BulkImportWizardProps) {
  const { tenantId } = useAuth();
  const addToast = useToast((s) => s.addToast);

  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [chunkStatus, setChunkStatus] = useState("");
  const [importResults, setImportResults] = useState<ImportResultRow[]>([]);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const handleFileParsed = useCallback((_rows: ParsedRow[]) => {
    setStep(3);
  }, []);

  const handleProcess = useCallback(
    async (rowsToProcess: ParsedRow[]) => {
      if (!tenantId) {
        addToast({ type: "error", message: "Tenant ID tidak ditemukan." });
        return;
      }

      if (rowsToProcess.length === 0) {
        addToast({
          type: "error",
          message: "Tidak ada baris valid untuk diproses.",
        });
        return;
      }

      setIsProcessing(true);
      setChunkStatus("");
      setStep(4);
      setProgress(10);

      try {
        const importJobId = await createImportJob(tenantId);
        setProgress(12);
        setChunkStatus("Menyiapkan antrean impor...");

        const rows: BulkImportRow[] = rowsToProcess.map((r) => ({
          email: r.email,
          full_name: r.full_name,
          role: r.role,
          nis: r.nis,
          nomor_hp: r.nomor_hp,
        }));

        await runBulkImport(rows, tenantId, importJobId);
        setProgress(20);
        setChunkStatus("Mengantrekan data ke worker...");

        let jobStatus = await getImportJobStatus(importJobId);
        const startedAt = Date.now();

        while (jobStatus.status === "processing") {
          const processedRows = jobStatus.success_rows + jobStatus.failed_rows;
          const totalRows = Math.max(jobStatus.total_rows, rows.length, 1);
          const percent = Math.min(
            95,
            Math.max(20, Math.round((processedRows / totalRows) * 80)),
          );
          setProgress(percent);
          setChunkStatus(
            `Memproses ${processedRows} dari ${totalRows} baris (${jobStatus.success_rows} berhasil, ${jobStatus.failed_rows} gagal)...`,
          );

          if (Date.now() - startedAt > 5 * 60 * 1000) {
            throw new Error(
              "Proses impor melebihi batas waktu tunggu. Silakan periksa lagi nanti.",
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 2000));
          jobStatus = await getImportJobStatus(importJobId);
        }

        const jobRows = await getImportJobRows(importJobId);
        const totalSuccess = jobStatus.success_rows;
        const totalFailed = jobStatus.failed_rows;

        const errorMap = new Map<number, string>();
        jobRows
          .filter((row) => row.status === "failed")
          .forEach((row) =>
            errorMap.set(row.row_number, row.error_reason ?? "Gagal diproses"),
          );

        const resultRows: ImportResultRow[] = rowsToProcess.map((r) => ({
          ...r,
          status: errorMap.has(r._rowIndex) ? "gagal" : "berhasil",
          reason: errorMap.get(r._rowIndex),
        }));

        setImportResults(resultRows);
        setSuccessCount(totalSuccess);
        setFailedCount(totalFailed);
        setProgress(100);
        setChunkStatus("");

        const overallStatus = jobStatus.status;

        if (overallStatus === "completed") {
          addToast({
            type: "success",
            message: `Berhasil mengimpor ${totalSuccess} pengguna.`,
          });
          onSuccess?.();
        } else if (overallStatus === "partial") {
          addToast({
            type: "warning",
            message: `Impor selesai: ${totalSuccess} berhasil, ${totalFailed} gagal.`,
          });
        } else {
          addToast({
            type: "error",
            message:
              "Semua baris gagal diimpor. Periksa laporan untuk detailnya.",
          });
        }
      } catch (err: unknown) {
        addToast({
          type: "error",
          message:
            err instanceof Error
              ? err.message
              : "Terjadi kesalahan saat memproses impor.",
        });
        setProgress(0);
        setChunkStatus("");
        setStep(3);
      } finally {
        setIsProcessing(false);
      }
    },
    [tenantId, addToast, onSuccess],
  );

  const downloadReport = () => {
    const reportRows = importResults.map((r) => ({
      email: r.email,
      nama_lengkap: r.full_name,
      peran: r.role,
      nis: r.nis ?? "",
      nomor_hp: r.nomor_hp ?? "",
      status: r.status,
      keterangan: r.reason ?? "",
    }));

    const csv = Papa.unparse(reportRows, {
      header: true,
      columns: [
        "email",
        "nama_lengkap",
        "peran",
        "nis",
        "nomor_hp",
        "status",
        "keterangan",
      ],
    });

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_impor_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetWizard = () => {
    setStep(1);
    setIsProcessing(false);
    setProgress(0);
    setChunkStatus("");
    setImportResults([]);
    setSuccessCount(0);
    setFailedCount(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isProcessing) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-700 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Impor Massal Pengguna
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Upload CSV untuk menambah banyak pengguna sekaligus
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
            aria-label="Tutup wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pt-6 shrink-0">
          <StepIndicator current={step} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {step === 1 && <BulkImportUploadStep onNext={() => setStep(2)} />}

          {(step === 2 || step === 3) && (
            <BulkImportPreviewStep
              onFileParsed={handleFileParsed}
              onBack={() => setStep(step === 2 ? 1 : 2)}
              onProcess={handleProcess}
              isProcessing={isProcessing}
            />
          )}

          {step === 4 && !isProcessing && (
            <BulkImportResultStep
              successCount={successCount}
              failedCount={failedCount}
              importResults={importResults}
              onDownloadReport={downloadReport}
              onRetry={resetWizard}
              onClose={onClose}
            />
          )}

          {step === 4 && isProcessing && (
            <BulkImportProgressStep
              progress={progress}
              chunkStatus={chunkStatus}
            />
          )}
        </div>
      </div>
    </div>
  );
}
