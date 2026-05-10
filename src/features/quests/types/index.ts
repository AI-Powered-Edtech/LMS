/**
 * Learning Quests / Missions System types
 * Phase 36A
 */

export type QuestType = "daily" | "weekly" | "milestone" | "challenge";

export type QuestConditionType =
  | "complete_lessons"
  | "quiz_score_above"
  | "assignment_submit"
  | "streak_maintain";

/** Quest row returned by get_active_quests_with_progress RPC */
export interface Quest {
  quest_id: string;
  title: string;
  description: string;
  quest_type: QuestType;
  icon: string;
  xp_reward: number;
  progress: number;
  target: number;
  is_completed: boolean;
}

/** Full quest definition row (teacher/admin management view) */
export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  quest_type: QuestType;
  icon: string;
  conditions: Record<string, unknown>;
  xp_reward: number;
  sort_order: number;
  is_active: boolean;
  tenant_id: string;
}

/** Labels for quest types in Indonesian */
export const QUEST_TYPE_LABELS: Record<QuestType, string> = {
  daily: "Harian",
  weekly: "Mingguan",
  milestone: "Pencapaian",
  challenge: "Tantangan",
};

/** Tailwind color tokens per quest type */
export const QUEST_TYPE_COLORS: Record<
  QuestType,
  { bg: string; text: string; border: string; darkBg: string; darkText: string }
> = {
  daily: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-200",
    darkBg: "dark:bg-blue-900/40",
    darkText: "dark:text-blue-300",
  },
  weekly: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
    darkBg: "dark:bg-purple-900/40",
    darkText: "dark:text-purple-300",
  },
  milestone: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
    darkBg: "dark:bg-amber-900/40",
    darkText: "dark:text-amber-300",
  },
  challenge: {
    bg: "bg-red-100",
    text: "text-red-700",
    border: "border-red-200",
    darkBg: "dark:bg-red-900/40",
    darkText: "dark:text-red-300",
  },
};

/** Labels for condition types */
export const CONDITION_TYPE_LABELS: Record<QuestConditionType, string> = {
  complete_lessons: "Selesaikan Pelajaran",
  quiz_score_above: "Skor Kuis Di Atas Target",
  assignment_submit: "Kumpulkan Tugas",
  streak_maintain: "Pertahankan Streak",
};
