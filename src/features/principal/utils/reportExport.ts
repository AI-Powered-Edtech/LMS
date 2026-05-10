// ==========================================================================
// reportExport.ts — Utility untuk ekspor laporan eksekutif ke PDF/CSV
//
// exportToPDF   — trigger print dialog browser (browser-based PDF save)
// exportToCSV   — download CSV dengan semua metrics laporan
// ==========================================================================

import type { ExecutiveReportData } from "../types";

/* ─── Helpers ──────────────────────────────────────────────── */

const IDR = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function fmtNumber(n: number): string {
  return new Intl.NumberFormat("id-ID").format(Math.round(n));
}

function fmtPercent(n: number): string {
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n)}%`;
}

function csvCell(value: string | number): string {
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildRow(cells: Array<string | number>): string {
  return cells.map(csvCell).join(",");
}

function buildFilename(prefix: string, period: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const safePeriod = period.replace(/\s+/g, "-").toLowerCase();
  return `${prefix}-${safePeriod}-${yyyy}${mm}${dd}.csv`;
}

function downloadCSV(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.setAttribute("download", filename);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/* ─── PDF Export (print dialog) ───────────────────────────── */

/**
 * Trigger browser print dialog untuk menyimpan sebagai PDF.
 * Halaman laporan harus sudah di-render sebelum memanggil ini.
 */
export function exportToPDF(): void {
  window.print();
}

/* ─── CSV Export ───────────────────────────────────────────── */

/**
 * Export semua data laporan eksekutif ke CSV.
 * Format: multi-section CSV dengan separator section.
 */
export function exportToCSV(reportData: ExecutiveReportData): void {
  const {
    schoolName,
    academicYear,
    period,
    generatedAt,
    metrics,
    monthlyTrend,
    academic,
    adoption,
    roi,
  } = reportData;

  const generatedDate = new Date(generatedAt).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sections: string[] = [];

  // ── Section 1: Header Info ──
  sections.push(buildRow(["LAPORAN EKSEKUTIF EDUSYNC LMS"]));
  sections.push(buildRow(["Sekolah", schoolName]));
  sections.push(buildRow(["Tahun Ajaran", academicYear]));
  sections.push(buildRow(["Periode", period]));
  sections.push(buildRow(["Dibuat pada", generatedDate]));
  sections.push("");

  // ── Section 2: Ringkasan Eksekutif ──
  sections.push(buildRow(["RINGKASAN EKSEKUTIF"]));
  sections.push(buildRow(["Metrik", "Nilai", "Keterangan"]));
  for (const metric of metrics) {
    sections.push(buildRow([metric.label, metric.value, metric.sub ?? ""]));
  }
  sections.push("");

  // ── Section 3: Tren Aktivitas Bulanan ──
  sections.push(buildRow(["TREN AKTIVITAS BULANAN"]));
  sections.push(
    buildRow([
      "Bulan",
      "Siswa Aktif",
      "Penyelesaian Pelajaran",
      "Percobaan Kuis",
    ]),
  );
  for (const row of monthlyTrend) {
    sections.push(
      buildRow([
        row.month,
        row.active_students,
        row.lesson_completions,
        row.quiz_attempts,
      ]),
    );
  }
  sections.push("");

  // ── Section 4: Kinerja Akademik ──
  sections.push(buildRow(["KINERJA AKADEMIK"]));
  sections.push(buildRow(["Metrik", "Nilai"]));
  sections.push(
    buildRow(["Rata-rata Nilai Kuis", `${fmtNumber(academic.avgScore)}/100`]),
  );
  sections.push(
    buildRow([
      "Tingkat Kelulusan Proyeksi",
      fmtPercent(academic.projectedPassRate),
    ]),
  );
  sections.push(buildRow(["Total Siswa", fmtNumber(academic.totalStudents)]));
  sections.push(buildRow(["Siswa Aktif", fmtNumber(academic.activeStudents)]));
  sections.push(
    buildRow(["Siswa Butuh Perhatian", fmtNumber(academic.atRiskStudents)]),
  );
  sections.push(
    buildRow(["Total Kursus Aktif", fmtNumber(academic.totalCourses)]),
  );
  sections.push("");

  // ── Section 5: Adopsi Platform ──
  sections.push(buildRow(["ADOPSI PLATFORM"]));
  sections.push(buildRow(["Metrik", "Persentase"]));
  sections.push(
    buildRow(["Adopsi Siswa", fmtPercent(adoption.studentAdoptionPct)]),
  );
  sections.push(
    buildRow(["Adopsi Guru", fmtPercent(adoption.teacherAdoptionPct)]),
  );
  sections.push(
    buildRow([
      "Skor Adopsi Digital",
      `${fmtNumber(adoption.adoptionScore)}/100`,
    ]),
  );
  sections.push("");

  // ── Section 6: ROI & Penghematan ──
  sections.push(buildRow(["ROI & ESTIMASI PENGHEMATAN"]));
  sections.push(buildRow(["Metrik", "Nilai"]));
  sections.push(
    buildRow([
      "Lembar Kertas Dihemat",
      `~${fmtNumber(roi.paperSavedSheets)} lembar`,
    ]),
  );
  sections.push(
    buildRow(["Estimasi Penghematan Kertas", IDR.format(roi.paperSavedCost)]),
  );
  sections.push(
    buildRow([
      "Efisiensi Waktu Guru",
      `~${roi.teacherTimeSavedHours} jam/minggu`,
    ]),
  );
  sections.push("");

  sections.push(buildRow(["Dibuat oleh EduSync LMS", generatedDate]));

  const csvContent = "\uFEFF" + sections.join("\r\n");
  const filename = buildFilename("laporan-eksekutif", period);
  downloadCSV(csvContent, filename);
}
