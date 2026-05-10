/**
 * csvQuestionParser.ts — CSV Question Import Parser
 *
 * Parses CSV files into question bank items for bulk import.
 * Supports MCQ, TRUE_FALSE, MULTIPLE_SELECT, SHORT_ANSWER, ESSAY question types.
 *
 * Expected CSV format:
 * question_text, question_type, difficulty, explanation, tags, option1, correct1, option2, correct2, ...
 *
 * - question_text: The question body (required)
 * - question_type: MCQ | TRUE_FALSE | MULTIPLE_SELECT | SHORT_ANSWER | ESSAY (default: MCQ)
 * - difficulty: 1-5 (default: 3)
 * - explanation: Optional explanation shown after answering
 * - tags: Comma-separated tags within quotes (e.g., "math,algebra")
 * - optionN/correctN: Option text and whether it's correct (TRUE/FALSE/1/0)
 */

import type { QuestionType } from "@/features/quizzes";

// ─── Types ───────────────────────────────────────────────

export interface ParsedQuestion {
  text: string;
  type: QuestionType;
  difficulty: number;
  explanation: string | null;
  tags: string[];
  options: {
    option_text: string;
    is_correct: boolean;
    order_index: number;
  }[];
}

export interface ParseResult {
  questions: ParsedQuestion[];
  errors: ParseError[];
  totalRows: number;
}

export interface ParseError {
  row: number;
  message: string;
}

// ─── Constants ───────────────────────────────────────────

const VALID_TYPES: QuestionType[] = [
  "MCQ",
  "TRUE_FALSE",
  "MULTIPLE_SELECT",
  "SHORT_ANSWER",
  "ESSAY",
];
const MAX_OPTIONS = 8;
const TRUTHY_VALUES = new Set(["true", "1", "yes", "benar", "TRUE"]);

// ─── CSV Parsing ─────────────────────────────────────────

/**
 * Parse a raw CSV string, handling quoted fields with commas inside.
 */
export function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Parse CSV content into structured questions.
 * First row is treated as a header and skipped.
 * FIXED: Strip UTF-8 BOM (\uFEFF) that Excel/Windows CSV exports prepend.
 *        Without stripping, the first header cell becomes "\uFEFFquestion_text"
 *        which causes silent misparse of the entire first data row.
 */
export function parseCSVQuestions(csvContent: string): ParseResult {
  // FIXED: Remove UTF-8 BOM if present (added by Excel, Windows Notepad, etc.)
  const cleanedContent = csvContent.replace(/^\uFEFF/, "");
  const lines = cleanedContent
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");
  const errors: ParseError[] = [];
  const questions: ParsedQuestion[] = [];

  if (lines.length < 2) {
    return {
      questions: [],
      errors: [
        {
          row: 0,
          message: "CSV harus memiliki header dan minimal 1 baris data",
        },
      ],
      totalRows: 0,
    };
  }

  // Skip header row
  const dataLines = lines.slice(1);

  for (let i = 0; i < dataLines.length; i++) {
    const rowNum = i + 2; // 1-indexed, +1 for header
    const fields = parseCSVLine(dataLines[i]);

    try {
      const question = parseQuestionRow(fields, rowNum);
      if (question) {
        questions.push(question);
      }
    } catch (err) {
      errors.push({
        row: rowNum,
        message: err instanceof Error ? err.message : "Unknown parsing error",
      });
    }
  }

  return { questions, errors, totalRows: dataLines.length };
}

/**
 * Parse a single row of CSV fields into a ParsedQuestion.
 */
function parseQuestionRow(fields: string[], rowNum: number): ParsedQuestion {
  if (fields.length < 1 || !fields[0]) {
    throw new Error("Pertanyaan tidak boleh kosong");
  }

  const text = fields[0];
  const rawType = (fields[1] || "MCQ").toUpperCase().trim();
  const type = VALID_TYPES.includes(rawType as QuestionType)
    ? (rawType as QuestionType)
    : "MCQ";
  const rawDiff = parseInt(fields[2]);
  const difficulty = Math.min(5, Math.max(1, isNaN(rawDiff) ? 3 : rawDiff));
  const explanation = fields[3]?.trim() || null;
  const tags = fields[4]
    ? fields[4]
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Parse options from remaining fields (pairs: text, is_correct)
  const options: ParsedQuestion["options"] = [];

  for (let j = 5; j < fields.length && options.length < MAX_OPTIONS; j += 2) {
    const optText = fields[j]?.trim();
    if (!optText) continue;

    const isCorrectRaw = (fields[j + 1] || "").trim().toLowerCase();
    const isCorrect =
      TRUTHY_VALUES.has(isCorrectRaw) || isCorrectRaw === "true";

    options.push({
      option_text: optText,
      is_correct: isCorrect,
      order_index: options.length,
    });
  }

  // Validate based on type
  if (type === "MCQ" || type === "MULTIPLE_SELECT") {
    if (options.length < 2) {
      throw new Error(`Baris ${rowNum}: ${type} membutuhkan minimal 2 opsi`);
    }
    const correctCount = options.filter((o) => o.is_correct).length;
    if (correctCount === 0) {
      throw new Error(`Baris ${rowNum}: Harus ada minimal 1 jawaban benar`);
    }
    if (type === "MCQ" && correctCount > 1) {
      throw new Error(`Baris ${rowNum}: MCQ hanya boleh 1 jawaban benar`);
    }
  }

  if (type === "TRUE_FALSE") {
    // Auto-generate True/False options if not provided
    if (options.length === 0) {
      options.push(
        { option_text: "Benar", is_correct: true, order_index: 0 },
        { option_text: "Salah", is_correct: false, order_index: 1 },
      );
    }
  }

  return { text, type, difficulty, explanation, tags, options };
}

/**
 * Generate a template CSV string that teachers can download and fill.
 */
export function generateTemplateCSV(): string {
  const header =
    "question_text,question_type,difficulty,explanation,tags,option1,correct1,option2,correct2,option3,correct3,option4,correct4";

  const examples = [
    '"Berapakah 2 + 2?",MCQ,2,"Penjumlahan dasar","matematika,dasar","3",FALSE,"4",TRUE,"5",FALSE,"6",FALSE',
    '"Matahari terbit dari barat",TRUE_FALSE,1,"Matahari terbit dari timur","sains,geografi",,,,,,,,',
    '"Pilih bilangan prima",MULTIPLE_SELECT,3,"2, 3, 5, 7 adalah bilangan prima","matematika","2",TRUE,"4",FALSE,"5",TRUE,"6",FALSE',
    '"Sebutkan ibu kota Indonesia",SHORT_ANSWER,1,"Jakarta","geografi,indonesia",,,,,,,,',
  ];

  return [header, ...examples].join("\n");
}
