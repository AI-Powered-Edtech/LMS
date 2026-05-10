// ==========================================================================
// ReportGenerator — Modal untuk generate laporan eksekutif
//
// UI:
//   - Jenis Laporan: Bulanan / Akademik / ROI & Adopsi
//   - Periode: bulan + tahun
//   - Format: PDF (print) dan/atau CSV
//   - Tombol: Batal | Generate Laporan
// ==========================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
} from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/contexts/AuthContext";
import { readVilSession } from "@/services/auth/vilSession";
import { detectStubResponse } from "@/utils/detectStubResponse";

import type {
  ExecutiveReportData,
  ReportFormat,
  ReportGeneratorState,
  ReportType,
} from "../types";
import { exportToCSV } from "../utils/reportExport";

/* ─── Constants ────────────────────────────────────────────── */

const ID_MONTHS = [
  { value: "1", label: "Januari" },
  { value: "2", label: "Februari" },
  { value: "3", label: "Maret" },
  { value: "4", label: "April" },
  { value: "5", label: "Mei" },
  { value: "6", label: "Juni" },
  { value: "7", label: "Juli" },
  { value: "8", label: "Agustus" },
  { value: "9", label: "September" },
  { value: "10", label: "Oktober" },
  { value: "11", label: "November" },
  { value: "12", label: "Desember" },
];

const REPORT_TYPES: Array<{
  value: ReportType;
  label: string;
  description: string;
}> = [
  {
    value: "monthly",
    label: "Laporan Bulanan",
    description: "Ringkasan aktivitas, tren, dan capaian bulan ini",
  },
  {
    value: "academic",
    label: "Laporan Akademik",
    description: "Kinerja akademik, nilai rata-rata, dan proyeksi kelulusan",
  },
  {
    value: "roi",
    label: "Laporan ROI & Adopsi Platform",
    description: "Estimasi penghematan, adopsi digital guru dan siswa",
  },
];

/* ─── Props ────────────────────────────────────────────────── */

export interface ReportGeneratorProps {
  open: boolean;
  onClose: () => void;
}

/* ─── ReportGenerator Component ───────────────────────────── */

export function ReportGenerator({ open, onClose }: ReportGeneratorProps) {
  const navigate = useNavigate();
  const { tenantId } = useAuth();

  const now = new Date();
  const [state, setState] = useState<ReportGeneratorState>({
    reportType: "monthly",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    formats: ["pdf"],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Year options: current year and 2 previous years
  const yearOptions = [
    { value: String(now.getFullYear()), label: String(now.getFullYear()) },
    {
      value: String(now.getFullYear() - 1),
      label: String(now.getFullYear() - 1),
    },
    {
      value: String(now.getFullYear() - 2),
      label: String(now.getFullYear() - 2),
    },
  ];

  function toggleFormat(fmt: ReportFormat) {
    setState((prev) => {
      const has = prev.formats.includes(fmt);
      // At least one format must be selected
      if (has && prev.formats.length === 1) return prev;
      return {
        ...prev,
        formats: has
          ? prev.formats.filter((f) => f !== fmt)
          : [...prev.formats, fmt],
      };
    });
  }

  async function handleGenerate() {
    if (!tenantId) return;
    setIsLoading(true);
    setError(null);

    try {
      // If only CSV is selected, we can generate without going to preview
      const wantPDF = state.formats.includes("pdf");
      const wantCSV = state.formats.includes("csv");

      if (wantCSV) {
        // Fetch report data for CSV
        const apiUrl = import.meta.env.VITE_API_URL ?? "";
        const token = readVilSession()?.access_token;

        const response = await fetch(`${apiUrl}/api/v1/pdf/executive-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            tenantId,
            reportType: state.reportType,
            month: state.month,
            year: state.year,
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (detectStubResponse(data, "Laporan eksekutif")) {
          // stub responded — toast shown by helper; skip CSV export attempt
        } else if (data?.reportData) {
          exportToCSV(data.reportData as ExecutiveReportData);
        }
      }

      if (wantPDF) {
        // Navigate to print-friendly preview page
        const params = new URLSearchParams({
          type: state.reportType,
          month: String(state.month),
          year: String(state.year),
        });
        onClose();
        void navigate(`/app/principal/report?${params.toString()}`);
        return;
      }

      // CSV only: close modal after download
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Gagal membuat laporan. Coba lagi.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }

  const selectedMonthLabel =
    ID_MONTHS.find((m) => m.value === String(state.month))?.label ?? "";
  const periodLabel = `${selectedMonthLabel} ${state.year}`;

  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="📋 Buat Laporan" onClose={onClose} />
      <ModalBody>
        <div className="space-y-5">
          {/* ── Jenis Laporan ── */}
          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Jenis Laporan
            </legend>
            <div className="space-y-2">
              {REPORT_TYPES.map((rt) => (
                <label
                  key={rt.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                    state.reportType === rt.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="reportType"
                    value={rt.value}
                    checked={state.reportType === rt.value}
                    onChange={() =>
                      setState((prev) => ({ ...prev, reportType: rt.value }))
                    }
                    className="mt-1 accent-blue-600"
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        state.reportType === rt.value
                          ? "text-blue-700 dark:text-blue-300"
                          : "text-slate-800 dark:text-slate-100"
                      }`}
                    >
                      {rt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {rt.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>

          {/* ── Periode ── */}
          <div>
            <p className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Periode
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <Select
                  label="Bulan"
                  options={ID_MONTHS}
                  value={String(state.month)}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      month: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
              <div className="flex-1">
                <Select
                  label="Tahun"
                  options={yearOptions}
                  value={String(state.year)}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      year: parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              Laporan periode: <strong>{periodLabel}</strong>
            </p>
          </div>

          {/* ── Format ── */}
          <fieldset>
            <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Format Output
            </legend>
            <div className="flex gap-3">
              {(
                [
                  {
                    value: "pdf" as ReportFormat,
                    label: "PDF",
                    icon: "📄",
                    desc: "Cetak / simpan PDF",
                  },
                  {
                    value: "csv" as ReportFormat,
                    label: "Excel/CSV",
                    icon: "📊",
                    desc: "Buka di Excel",
                  },
                ] as const
              ).map((fmt) => {
                const active = state.formats.includes(fmt.value);
                return (
                  <label
                    key={fmt.value}
                    className={`flex-1 flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all duration-150 ${
                      active
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => toggleFormat(fmt.value)}
                      className="accent-blue-600"
                    />
                    <span className="text-lg">{fmt.icon}</span>
                    <div>
                      <p
                        className={`text-sm font-semibold ${
                          active
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {fmt.label}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {fmt.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* ── Error ── */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
        <Button variant="primary" onClick={handleGenerate} loading={isLoading}>
          Generate Laporan
        </Button>
      </ModalFooter>
    </Modal>
  );
}
