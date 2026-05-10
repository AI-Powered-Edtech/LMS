// ─── Source Type ──────────────────────────────────────────────────────────────

/** Where the AI generation was seeded from */
export type AISourceType = "file" | "lesson";

// ─── Question Types ───────────────────────────────────────────────────────────

export type QuestionType =
  | "MCQ"
  | "TRUE_FALSE"
  | "MULTIPLE_SELECT"
  | "SHORT_ANSWER"
  | "OPEN";

export type AssignmentType = "quiz" | "reading" | "writing";

// ─── Canonical Question Shapes ────────────────────────────────────────────────

/** Quiz question — options carry their own correctness flag (NOT index-based) */
export interface AIQuizQuestion {
  id: string;
  question_type: Exclude<QuestionType, "OPEN">;
  text: string;
  options: Array<{ text: string; is_correct: boolean }>;
  explanation?: string;
  points?: number;
  bloomLevel?: string;
}

/** Open-ended question for reading / writing assignment types */
export interface AIOpenQuestion {
  id: string;
  question_type: "OPEN";
  text: string;
  answer: string; // key answer / rubric criteria
  bloomLevel?: string;
}

/** Discriminated union on question_type */
export type AIAuthoringQuestion = AIQuizQuestion | AIOpenQuestion;

// ─── Type Guards ──────────────────────────────────────────────────────────────

export function isQuizQuestion(q: AIAuthoringQuestion): q is AIQuizQuestion {
  return q.question_type !== "OPEN";
}

export function isOpenQuestion(q: AIAuthoringQuestion): q is AIOpenQuestion {
  return q.question_type === "OPEN";
}

// ─── Curriculum Config ────────────────────────────────────────────────────────

export interface CurriculumConfig {
  subject?: string;
  gradeLevel?: string;
  curriculumRef?: string;
}

// ─── Request Configs ─────────────────────────────────────────────────────────

export interface GenerateFromFileConfig extends CurriculumConfig {
  file: File;
  assignmentType: AssignmentType;
  questionCount: number;
  /** Bloom taxonomy difficulty level, e.g. 'C1'–'C6' */
  difficulty: string;
}

export interface GenerateFromLessonConfig extends CurriculumConfig {
  lessonId: string;
  questionCount: number;
  questionTypes: Exclude<QuestionType, "OPEN">[];
  difficulty: "easy" | "medium" | "hard";
}

// ─── Response Shapes ─────────────────────────────────────────────────────────

export interface GenerateFromFileResponse {
  /** null when DB save failed (non-fatal) */
  generation_id: string | null;
  type: AssignmentType;
  tenant_id: string;
  summary: string;
  questions: AIAuthoringQuestion[];
}

export interface GenerateFromLessonResponse {
  /** null when DB save failed (non-fatal) */
  generation_id: string | null;
  questions: AIQuizQuestion[];
  lesson_title: string;
}

// ─── DB Entity ────────────────────────────────────────────────────────────────

export interface AIGeneratedContent {
  id: string;
  tenant_id: string;
  created_by: string;
  // file-source fields
  file_name: string;
  file_type: string;
  // lesson-source fields
  source_type: AISourceType;
  lesson_id: string | null;
  // curriculum metadata
  subject: string | null;
  grade_level: string | null;
  curriculum_ref: string | null;
  // generation config
  assignment_type: AssignmentType;
  bloom_level: string;
  question_count: number;
  // output
  summary: string | null;
  questions: AIAuthoringQuestion[];
  // timestamps
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Bloom Taxonomy ───────────────────────────────────────────────────────────

export type BloomLevel = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export const BLOOM_LABELS: Record<BloomLevel, string> = {
  C1: "C1-Mengingat",
  C2: "C2-Memahami",
  C3: "C3-Mengaplikasikan",
  C4: "C4-Menganalisis",
  C5: "C5-Mengevaluasi",
  C6: "C6-Mencipta",
};

export const BLOOM_DESCRIPTIONS: Record<BloomLevel, string> = {
  C1: "Soal menguji daya ingat fakta dan definisi",
  C2: "Soal menguji pemahaman dan kemampuan menjelaskan",
  C3: "Soal menguji kemampuan menerapkan konsep",
  C4: "Soal menguji kemampuan menganalisis dan membandingkan",
  C5: "Soal menguji kemampuan mengevaluasi dan menilai",
  C6: "Soal menguji kemampuan mencipta dan bersintesis",
};

// ─── Question Type UI Metadata ────────────────────────────────────────────────

/** Indonesian display labels for each QuestionType */
export const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ: "Pilihan Ganda",
  TRUE_FALSE: "Benar/Salah",
  MULTIPLE_SELECT: "Pilih Beberapa",
  SHORT_ANSWER: "Jawaban Singkat",
  OPEN: "Esai / Uraian",
};

/** Tailwind badge classes for each QuestionType (includes dark: variants) */
export const QUESTION_TYPE_COLORS: Record<string, string> = {
  MCQ: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  TRUE_FALSE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  MULTIPLE_SELECT:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  SHORT_ANSWER:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  OPEN: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
};
