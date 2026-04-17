/**
 * Backend-Heavy API Services
 *
 * These services call the Rust backend for:
 * - Quiz Grading (security - no answer key in client)
 * - Anti-Cheat (server-side tracking)
 * - XP System (consistent calculations)
 * - Gradebook (statistics)
 * - Quiz Timer (server-authoritative)
 * - Item Analysis (statistics)
 */

import { createVilApiClient } from "./vilApiClient";

const client = createVilApiClient();

// ─── Types ────────────────────────────────────────────────────────────────

export interface GradeableQuestion {
  id: string;
  question_type:
    | "MCQ"
    | "TRUE_FALSE"
    | "MULTIPLE_SELECT"
    | "SHORT_ANSWER"
    | "ESSAY";
  points: number;
  correct_option_ids: string[];
  accepted_answers?: string[];
}

export interface StudentAnswer {
  question_id: string;
  selected_option_ids: string[];
  text_answer?: string | null;
}

export interface QuestionGradeResult {
  question_id: string;
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  partial_credit_ratio?: number;
}

export interface AttemptGradeResult {
  results: QuestionGradeResult[];
  total_score: number;
  max_score: number;
  percentage: number;
  status: string;
}

export interface RecordEventRequest {
  attempt_id: string;
  event_type: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordEventResponse {
  accumulated_score: number;
  severity_level: string;
  should_terminate: boolean;
  should_flag: boolean;
  event_count: number;
}

export interface AntiCheatEvent {
  event_type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface AntiCheatReport {
  attempt_id: string;
  events: AntiCheatEvent[];
  total_score: number;
  severity_level: string;
  flagged: boolean;
  should_terminate: boolean;
  recommendation: string;
}

export interface StartAttemptResponse {
  attempt_id: string;
  started_at: string;
  deadline: string;
  duration_seconds: number;
  server_time: string;
}

export interface PauseAttemptResponse {
  paused_at: string;
  remaining_time_seconds: number;
  pause_remaining: number;
}

export interface ResumeAttemptResponse {
  resumed_at: string;
  new_deadline: string;
  remaining_time_seconds: number;
}

export interface TimeRemainingResponse {
  remaining_seconds: number;
  server_time: string;
  status: string;
  warning_state?: string;
}

export interface UserXpInfo {
  user_id: string;
  total_xp: number;
  current_level: number;
  current_streak: number;
  last_activity_at?: string;
}

export interface AwardXpRequest {
  activity_type: string;
  activity_id?: string;
  base_xp?: number;
}

export interface AwardXpResponse {
  new_total_xp: number;
  new_level: number;
  leveled_up: boolean;
  xp_awarded: number;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  display_name?: string;
  total_xp: number;
  current_level: number;
  rank: number;
}

export interface XpTransaction {
  id: string;
  activity_type: string;
  activity_id?: string;
  xp_amount: number;
  created_at: string;
}

export interface AssignmentGrade {
  assignment_id: string;
  assignment_name: string;
  score?: number;
  max_score: number;
  weight: number;
  submitted_at?: string;
  status: string;
}

export interface StudentGrade {
  student_id: string;
  student_name: string;
  grades: AssignmentGrade[];
  weighted_average: number;
  letter_grade: string;
  grade_color: string;
}

export interface GradeDistribution {
  a_count: number;
  b_count: number;
  c_count: number;
  d_count: number;
  e_count: number;
}

export interface ClassStatistics {
  total_students: number;
  submitted_count: number;
  highest_average: number;
  lowest_average: number;
  class_average: number;
  std_deviation: number;
  grade_distribution: GradeDistribution;
}

export interface GradebookResponse {
  students: StudentGrade[];
  class_id: string;
  statistics: ClassStatistics;
}

export interface ItemStatistics {
  question_id: string;
  difficulty_index: number;
  discrimination_index: number;
  point_biserial: number;
  total_attempts: number;
  correct_count: number;
  recommendation: string;
  reliability_rating: string;
}

export interface QuizItemAnalysis {
  quiz_id: string;
  items: ItemStatistics[];
  average_difficulty: number;
  average_discrimination: number;
  reliability_score: number;
}

// ─── Quiz Grading Service ─────────────────────────────────────────────────

export const quizGradingService = {
  async gradeAnswer(question: GradeableQuestion, answer?: StudentAnswer) {
    return client.rpc<QuestionGradeResult>("quiz.grade-answer", {
      question,
      answer,
    });
  },

  async gradeAttempt(questions: GradeableQuestion[], answers: StudentAnswer[]) {
    return client.rpc<AttemptGradeResult>("quiz.grade-attempt", {
      questions,
      answers,
    });
  },
};

// ─── Anti-Cheat Service ────────────────────────────────────────────────────

export const antiCheatService = {
  async recordEvent(request: RecordEventRequest) {
    return client.rpc<RecordEventResponse>("quiz.anticheat-event", request);
  },

  async getReport(attemptId: string) {
    return client.rpc<AntiCheatReport>("quiz.anticheat-report", {
      attempt_id: attemptId,
    });
  },
};

// ─── Quiz Timer Service ────────────────────────────────────────────────────

export const quizTimerService = {
  async startAttempt(quizId: string) {
    return client.rpc<StartAttemptResponse>("quiz.start-attempt", {
      quiz_id: quizId,
    });
  },

  async pauseAttempt(attemptId: string) {
    return client.rpc<PauseAttemptResponse>("quiz.pause-attempt", {
      attempt_id: attemptId,
    });
  },

  async resumeAttempt(attemptId: string) {
    return client.rpc<ResumeAttemptResponse>("quiz.resume-attempt", {
      attempt_id: attemptId,
    });
  },

  async getTimeRemaining(attemptId: string) {
    return client.rpc<TimeRemainingResponse>("quiz.time-remaining", {
      attempt_id: attemptId,
    });
  },
};

// ─── XP Service ────────────────────────────────────────────────────────────

export const xpService = {
  async awardXp(request: AwardXpRequest) {
    return client.rpc<AwardXpResponse>("xp.award", request);
  },

  async getUserXp(userId: string) {
    return client.rpc<UserXpInfo>("xp.get-user", { user_id: userId });
  },

  async getLeaderboard(courseId?: string, limit = 10) {
    return client.rpc<LeaderboardEntry[]>("xp.leaderboard", {
      course_id: courseId,
      limit,
    });
  },

  async getTransactions(userId: string, limit = 20) {
    return client.rpc<XpTransaction[]>("xp.transactions", {
      user_id: userId,
      limit,
    });
  },
};

// ─── Gradebook Service ────────────────────────────────────────────────────

export const gradebookService = {
  async getClassGradebook(classId: string) {
    return client.rpc<GradebookResponse>("gradebook.class", {
      class_id: classId,
    });
  },

  async getStudentGrades(studentId: string, courseId?: string) {
    return client.rpc<StudentGrade[]>("gradebook.student", {
      student_id: studentId,
      course_id: courseId,
    });
  },
};

// ─── Item Analysis Service ─────────────────────────────────────────────────

export const itemAnalysisService = {
  async analyzeQuiz(quizId: string) {
    return client.rpc<QuizItemAnalysis>("quiz.item-analysis", {
      quiz_id: quizId,
    });
  },

  async analyzeItem(questionId: string) {
    return client.rpc<ItemStatistics>("quiz.analyze-item", {
      question_id: questionId,
    });
  },
};

// ─── Re-export for convenience ────────────────────────────────────────────

export type {
  GradeableQuestion,
  StudentAnswer,
  QuestionGradeResult,
  AttemptGradeResult,
  RecordEventRequest,
  RecordEventResponse,
  AntiCheatEvent,
  AntiCheatReport,
  StartAttemptResponse,
  PauseAttemptResponse,
  ResumeAttemptResponse,
  TimeRemainingResponse,
  UserXpInfo,
  AwardXpRequest,
  AwardXpResponse,
  LeaderboardEntry,
  XpTransaction,
  AssignmentGrade,
  StudentGrade,
  GradeDistribution,
  ClassStatistics,
  GradebookResponse,
  ItemStatistics,
  QuizItemAnalysis,
};
