import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import type {
  Achievement,
  AchievementItem,
  CourseProgressItem,
  ProfileData,
  QuizAttemptData,
  StudentProgressData,
} from "./types";

export type { StudentProgressData } from "./types";

interface ProgressBundleRaw {
  profile: { total_xp: number } | null;
  total_xp: number;
  completed_lessons_count: number;
  quiz_attempts: Array<{ quiz_id: string; score: number }>;
  achievements: Array<{
    id: string;
    earned_at: string;
    name: string;
    icon: string;
  }>;
  course_progress: Array<{
    id: string;
    course_id: string;
    total_lessons: number;
    completed_lessons: number;
  }>;
}

export const progressService = {
  async getStudentProgressBundle(
    studentId: string,
    _tenantId: string,
  ): Promise<StudentProgressData> {
    try {
      const { data, error } = await db.rpc<ProgressBundleRaw | null>(
        "get_student_progress_bundle",
        {
          p_student_id: studentId,
        },
      );

      if (error) throw error;
      if (!data) {
        return {
          profile: null,
          totalXP: 0,
          completedLessonsCount: 0,
          quizAttempts: [],
          achievements: [],
          courseProgress: [],
        };
      }

      const profile: ProfileData | null = data.profile
        ? { total_xp: data.profile.total_xp }
        : null;
      const quizAttempts: QuizAttemptData[] = (data.quiz_attempts || []).map(
        (q, index) => ({
          id: `quiz-${index}`,
          quiz_id: q.quiz_id,
          score: q.score,
        }),
      );
      const achievements: Achievement[] = (data.achievements || []).map(
        (a: AchievementItem) => ({
          id: a.id,
          earned_at: a.earned_at,
          badges: {
            name: a.name,
            icon: a.icon,
          },
        }),
      );
      const courseProgress: CourseProgressItem[] = (
        data.course_progress || []
      ).map((cp) => ({
        id: cp.id,
        course_id: cp.course_id,
        total_lessons: cp.total_lessons,
        completed_lessons: cp.completed_lessons,
        percentage:
          cp.total_lessons > 0
            ? Math.round((cp.completed_lessons / cp.total_lessons) * 100)
            : 0,
      }));

      return {
        profile,
        totalXP: data.total_xp ?? 0,
        completedLessonsCount: data.completed_lessons_count ?? 0,
        quizAttempts,
        achievements,
        courseProgress,
      };
    } catch (error) {
      if (import.meta.env.DEV)
        logger.error("Error fetching student progress bundle:", error);
      throw error;
    }
  },
  // Keep individual method for now but getStudentProgressBundle is preferred
  async getStudentProgress(
    studentId: string,
    _tenantId: string,
  ): Promise<StudentProgressData> {
    try {
      const { data, error } = await db.rpc<StudentProgressData>(
        "get_student_progress",
        {
          p_student_id: studentId,
        },
      );

      if (error) throw error;
      if (!data) {
        return {
          profile: null,
          totalXP: 0,
          completedLessonsCount: 0,
          quizAttempts: [],
          achievements: [],
          courseProgress: [],
        } as StudentProgressData;
      }

      return data;
    } catch (error) {
      if (import.meta.env.DEV)
        logger.error("Error fetching student progress:", error);
      throw error;
    }
  },
};
