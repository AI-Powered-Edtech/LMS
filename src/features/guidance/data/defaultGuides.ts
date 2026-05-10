// SP-18: Default guide definitions (static data — no DB migration required)
// These can be upserted via the admin guidance panel or used as seeding templates.

import type { LearningGuide } from "../types";

/**
 * Welcome Dashboard guide — shown on first visit to the student dashboard.
 * Trigger: on_enter | Target: course (used as dashboard context).
 */
const WELCOME_DASHBOARD_GUIDE: Omit<
  LearningGuide,
  | "id"
  | "total_impressions"
  | "total_dismissals"
  | "total_completions"
  | "created_at"
> = {
  title: "Selamat datang di EduSync!",
  content:
    "Ini adalah dashboard belajarmu. Kamu bisa melihat kelas, tugas, rekomendasi, dan pencapaianmu di sini. Ayo mulai belajar!",
  guide_type: "banner",
  target_type: "course",
  target_id: "dashboard",
  segment: "all",
  trigger_type: "on_enter",
  trigger_value: 0,
  priority: 10,
  is_active: true,
  max_impressions: 3,
  starts_at: null,
  ends_at: null,
};

/**
 * Lesson Viewer intro guide — shown when a student opens their first lesson.
 * Trigger: after_seconds (5 s) | Target: lesson.
 */
const LESSON_VIEWER_INTRO_GUIDE: Omit<
  LearningGuide,
  | "id"
  | "total_impressions"
  | "total_dismissals"
  | "total_completions"
  | "created_at"
> = {
  title: "Cara menggunakan Lesson Viewer",
  content:
    'Kamu sedang berada di halaman pelajaran. Ikuti materi di tengah, gunakan sidebar kiri untuk berpindah pelajaran, dan klik "Tandai Selesai" setelah selesai membaca.',
  guide_type: "banner",
  target_type: "lesson",
  target_id: "intro",
  segment: "all",
  trigger_type: "after_seconds",
  trigger_value: 5,
  priority: 10,
  is_active: true,
  max_impressions: 2,
  starts_at: null,
  ends_at: null,
};

/** Convenience array containing both default guides */
export const DEFAULT_GUIDES = [
  WELCOME_DASHBOARD_GUIDE,
  LESSON_VIEWER_INTRO_GUIDE,
] as const;
