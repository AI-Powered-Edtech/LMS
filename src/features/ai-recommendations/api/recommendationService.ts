import { db } from "@/services/db";

import type { LearningRecommendation, RecommendationResult } from "../types";

interface CourseModuleRow {
  id: string;
  title: string;
  order: number;
}

interface LessonRow {
  id: string;
  title: string;
  order: number;
  module_id: string;
}

function toPriority(index: number): LearningRecommendation["priority"] {
  if (index === 0) return "high";
  if (index === 1) return "medium";
  return "low";
}

export const aiRecommendationService = {
  /**
   * Rule-based learning path recommendations from existing VIL data tables.
   * This keeps the widget useful without depending on a separate AI endpoint.
   */
  async getRecommendations(courseId: string): Promise<RecommendationResult> {
    const { data: modules, error: modulesError } = await db
      .from<CourseModuleRow[]>("course_modules")
      .select("id, title, order")
      .eq("course_id", courseId)
      .order("order", { ascending: true })
      .limit(6);

    if (modulesError) throw modulesError;

    const moduleRows = modules ?? [];
    if (moduleRows.length === 0) {
      return { recommendations: [], generated_by: "rule_based" };
    }

    const moduleIds = moduleRows.map((module) => module.id);
    const moduleTitleById = new Map(
      moduleRows.map((module) => [module.id, module.title]),
    );

    const { data: lessons, error: lessonsError } = await db
      .from<LessonRow[]>("lessons")
      .select("id, title, order, module_id")
      .in("module_id", moduleIds)
      .eq("is_published", true)
      .order("order", { ascending: true })
      .limit(6);

    if (lessonsError) throw lessonsError;

    const recommendations = (lessons ?? [])
      .slice(0, 3)
      .map((lesson, index) => ({
        lesson_id: lesson.id,
        lesson_title: lesson.title,
        reason: `Lanjutkan dari modul ${moduleTitleById.get(lesson.module_id) ?? "berikutnya"} agar progres belajar tetap runtut.`,
        priority: toPriority(index),
      }));

    return { recommendations, generated_by: "rule_based" };
  },
};
