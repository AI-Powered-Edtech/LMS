import Papa from "papaparse";

import type { ForumParticipationRow } from "../queries/discussionQueries";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ParticipationExportData {
  data: ForumParticipationRow[];
  courseName?: string;
  className?: string;
  dateRange?: {
    from: string;
    to: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function formatDate(dateString: string | null): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Main export function ──────────────────────────────────────────────────────

/**
 * Mengekspor data partisipasi forum ke file CSV dan memicu unduhan di browser.
 *
 * Kolom: No, Nama Siswa, Total Postingan, Total Komentar, Tingkat Partisipasi,
 *        Aktivitas Terakhir, Status Partisipasi
 *
 * @param data - Data partisipasi forum
 * @param filename - Nama file tanpa ekstensi (opsional, auto-generated jika tidak diisi)
 */
export function exportParticipationToCSV(
  data: ParticipationExportData,
  filename?: string,
): void {
  const { data: participationData, courseName, className, dateRange } = data;

  // Susun baris CSV
  type CsvRow = Record<string, string | number>;
  const rows: CsvRow[] = [];

  participationData.forEach((participant, idx) => {
    const participationRate = participant.participation_rate;
    let status = "Tidak Aktif";
    if (participationRate >= 80) status = "Sangat Aktif";
    else if (participationRate >= 60) status = "Aktif";
    else if (participationRate >= 40) status = "Cukup Aktif";
    else if (participationRate > 0) status = "Kurang Aktif";

    const row: CsvRow = {
      No: idx + 1,
      "Nama Siswa": participant.student_name,
      "Total Postingan": participant.total_posts,
      "Total Komentar": participant.total_comments,
      "Tingkat Partisipasi (%)": Number(participationRate.toFixed(1)),
      "Aktivitas Terakhir": formatDate(participant.last_activity),
      "Status Partisipasi": status,
    };

    rows.push(row);
  });

  // Jika tidak ada data, tambahkan baris kosong agar file tetap valid
  if (rows.length === 0) {
    rows.push({
      No: "-",
      "Nama Siswa": "-",
      "Total Postingan": "-",
      "Total Komentar": "-",
      "Tingkat Partisipasi (%)": "-",
      "Aktivitas Terakhir": "-",
      "Status Partisipasi": "-",
    });
  }

  const csv = Papa.unparse(rows);

  // Generate nama file
  const dateStr = new Date().toISOString().slice(0, 10);
  const courseSlug = courseName ? `-${sanitizeFilename(courseName)}` : "";
  const classSlug = className ? `-${sanitizeFilename(className)}` : "";
  const dateSlug = dateRange
    ? `-${dateRange.from.replace(/-/g, "")}_${dateRange.to.replace(/-/g, "")}`
    : "";
  const resolvedFilename = filename
    ? `${filename}.csv`
    : `partisipasi-forum${courseSlug}${classSlug}${dateSlug}-${dateStr}.csv`;

  // Trigger download
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", resolvedFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
