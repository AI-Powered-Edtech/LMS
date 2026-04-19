export interface ProfileData {
  full_name?: string;
  avatar_url?: string;
  total_xp: number;
}

export interface QuizAttemptData {
  id: string;
  quiz_id: string;
  score: number;
  created_at?: string;
}

export interface AchievementItem {
  id: string;
  earned_at: string;
  name: string;
  icon: string;
}

export interface AchievementBadge {
  name: string;
  icon: string;
}

export interface Achievement {
  id: string;
  earned_at: string;
  badges: AchievementBadge;
}

export interface CourseTitle {
  title?: string;
}

export interface CourseProgressItem {
  id: string;
  course_id: string;
  total_lessons: number;
  completed_lessons?: number;
  courses?: CourseTitle;
  percentage?: number;
  last_activity_at?: string;
}

export interface StudentProgressData {
  profile: ProfileData | null;
  totalXP: number;
  completedLessonsCount: number;
  quizAttempts: QuizAttemptData[];
  achievements: Achievement[];
  courseProgress: CourseProgressItem[];
}
