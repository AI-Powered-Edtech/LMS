// ─── Enums / Literal Types ───────────────────────────────────────────────────

export type ArtifactKind =
  | "outline"
  | "lesson_draft"
  | "assessment"
  | "transform";
export type ArtifactStatus = "generated" | "applied" | "dismissed";
export type ArtifactTargetType = "course" | "module" | "lesson" | "block";
export type ArtifactSourceType = "prompt" | "file" | "lesson";

export type TransformAction =
  | "summarize"
  | "expand"
  | "simplify"
  | "tone-rewrite"
  | "grade-align"
  | "quiz-seed"
  | "assignment-brief";

export type CopilotTab =
  | "outline"
  | "lesson_draft"
  | "assessment"
  | "improve"
  | "history";

// ─── Launch Context ──────────────────────────────────────────────────────────

export interface CopilotLaunchContext {
  entryPoint:
    | "topbar"
    | "sidebar_empty"
    | "lesson_empty"
    | "block_action"
    | "release_panel";
  targetType?: ArtifactTargetType;
  targetId?: string;
  preSelectedTab?: CopilotTab;
  blockContent?: string;
}

// ─── DB Entity ───────────────────────────────────────────────────────────────

export interface AIBuilderArtifact {
  id: string;
  tenant_id: string;
  course_id: string;
  created_by: string;
  artifact_kind: ArtifactKind;
  target_type: ArtifactTargetType;
  target_id: string | null;
  source_type: ArtifactSourceType;
  source_ref_id: string | null;
  prompt_config: Record<string, unknown>;
  output: Record<string, unknown>;
  status: ArtifactStatus;
  created_at: string;
  updated_at: string;
}

// ─── Outline ─────────────────────────────────────────────────────────────────

export interface OutlineLesson {
  title: string;
  type: string;
  duration_minutes?: number;
}

export interface OutlineModule {
  title: string;
  lessons: OutlineLesson[];
}

export interface GenerateOutlineRequest {
  course_id: string;
  course_title: string;
  course_description?: string;
  subject?: string;
  grade_level?: string;
  target_module_count?: number;
  target_lesson_count?: number;
}

export interface GenerateOutlineResponse {
  artifact_id: string | null;
  outline: { modules: OutlineModule[] };
}

// ─── Lesson Draft ────────────────────────────────────────────────────────────

export interface LessonDraftBlock {
  type: string;
  title: string | null;
  content: string;
}

export interface AssessmentSuggestions {
  quiz_title?: string;
  assignment_title?: string;
  assignment_instructions?: string;
}

export interface QuizDraftQuestion {
  text: string;
  order: number;
  question_type: "MCQ" | "TRUE_FALSE" | "MULTIPLE_SELECT" | "SHORT_ANSWER";
  points?: number;
  explanation?: string | null;
  options: Array<{
    text: string;
    is_correct: boolean;
  }>;
}

export interface QuizDraftPayload {
  title: string;
  instructions?: string | null;
  max_attempts?: number;
  passing_score?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  status?: "draft" | "published";
  mode?: "practice" | "graded" | "exam";
  questions: QuizDraftQuestion[];
}

export interface AssignmentDraftPayload {
  title: string;
  instructions: string;
  max_points?: number;
  max_attempts?: number;
}

export interface GenerateLessonDraftRequest {
  lesson_id: string;
  course_id: string;
  content_types?: string[];
  subject?: string;
  grade_level?: string;
}

export interface GenerateLessonDraftResponse {
  artifact_id: string | null;
  draft: {
    blocks: LessonDraftBlock[];
    assessment_suggestions?: AssessmentSuggestions;
    quiz_payload?: QuizDraftPayload;
    assignment_payload?: AssignmentDraftPayload;
  };
}

// ─── Transform ───────────────────────────────────────────────────────────────

export interface TransformContentRequest {
  course_id: string;
  block_content: string;
  action: TransformAction;
  context?: {
    lesson_id?: string;
    lesson_title?: string;
    block_type?: string;
    subject?: string;
    grade_level?: string;
    block_id?: string;
  };
}

export interface TransformContentResponse {
  artifact_id: string | null;
  result: Record<string, unknown>;
}

// ─── Apply ───────────────────────────────────────────────────────────────────

export interface ApplyOutlineResult {
  modules: string[];
  lessons: string[];
}

export interface ApplyLessonDraftResult {
  blocks: string[];
  quiz_id: string | null;
  assignment_id: string | null;
}

// ─── Artifact Labels (Bahasa Indonesia) ──────────────────────────────────────

export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  outline: "Kerangka Kursus",
  lesson_draft: "Draft Pelajaran",
  assessment: "Asesmen",
  transform: "Transformasi Konten",
};

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  generated: "Dihasilkan",
  applied: "Diterapkan",
  dismissed: "Diabaikan",
};

export const TRANSFORM_ACTION_LABELS: Record<TransformAction, string> = {
  summarize: "Ringkas",
  expand: "Perluas",
  simplify: "Sederhanakan",
  "tone-rewrite": "Ubah Nada",
  "grade-align": "Sesuaikan Kelas",
  "quiz-seed": "Buat Kuis",
  "assignment-brief": "Buat Tugas",
};
