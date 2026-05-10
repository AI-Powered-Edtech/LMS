/**
 * Export AI-generated questions to CSV format.
 * Uses BOM (\uFEFF) for Excel compatibility with Indonesian text.
 */
import type {
  AssignmentType,
  GeneratedOpenQuestion,
  GeneratedQuestion,
  GeneratedQuizQuestion,
} from "../types";

function isQuizQuestion(q: GeneratedQuestion): q is GeneratedQuizQuestion {
  return "options" in q && Array.isArray((q as GeneratedQuizQuestion).options);
}

function escapeCsv(val: unknown): string {
  const s = String(val ?? "");
  if (
    s.includes(",") ||
    s.includes('"') ||
    s.includes("\n") ||
    s.includes("\r")
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function exportQuestionsToCSV(
  questions: GeneratedQuestion[],
  assignmentType: AssignmentType,
  fileName: string,
): void {
  if (questions.length === 0) return;

  let headers: string[];
  let rows: string[][];

  if (assignmentType === "quiz") {
    headers = [
      "No",
      "Pertanyaan",
      "Opsi A",
      "Opsi B",
      "Opsi C",
      "Opsi D",
      "Jawaban Benar",
      "Penjelasan",
      "Level Bloom",
    ];
    rows = questions.map((q, i) => {
      if (isQuizQuestion(q)) {
        const opts = q.options;
        const optTexts = opts.map((o) => o.text);
        const correctIdx = opts.findIndex((o) => o.is_correct);
        const correctLetter = ["A", "B", "C", "D"][correctIdx] ?? "";
        return [
          String(i + 1),
          q.text,
          optTexts[0] ?? "",
          optTexts[1] ?? "",
          optTexts[2] ?? "",
          optTexts[3] ?? "",
          correctLetter,
          q.explanation ?? "",
          q.bloomLevel ?? "",
        ];
      }
      // fallback for non-quiz questions in a quiz export (shouldn't happen)
      return [
        String(i + 1),
        q.text,
        "",
        "",
        "",
        "",
        "",
        "",
        q.bloomLevel ?? "",
      ];
    });
  } else {
    const questionLabel = assignmentType === "writing" ? "Topik" : "Pertanyaan";
    const answerLabel =
      assignmentType === "writing" ? "Rubrik Penilaian" : "Kunci Jawaban";
    headers = ["No", questionLabel, answerLabel, "Level Bloom"];
    rows = questions.map((q, i) => {
      const openQ = q as GeneratedOpenQuestion;
      return [String(i + 1), q.text, openQ.answer ?? "", q.bloomLevel ?? ""];
    });
  }

  const csvLines = [headers, ...rows].map((row) =>
    row.map(escapeCsv).join(","),
  );
  const csvContent = "\uFEFF" + csvLines.join("\r\n"); // BOM + CRLF for Excel

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName.replace(/\.[^/.]+$/, "") || "soal_ai"}_${assignmentType}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
