// Quiz Analytics Service
// API functions to fetch quiz and question statistics

import { supabase } from '../../../lib/supabase';

// ============================================
// Types
// ============================================

export interface QuizStats {
  quiz_id: string;
  tenant_id: string;
  total_attempts: number;
  total_unique_students: number;
  avg_score: number;
  median_score: number;
  highest_score: number;
  lowest_score: number;
  avg_time_seconds: number;
  pass_rate: number;
  updated_at: string;
}

export interface QuestionStats {
  id: string;
  question_id: string;
  quiz_id: string;
  tenant_id: string;
  total_answers: number;
  correct_answers: number;
  difficulty_rate: number;
  avg_time_seconds: number;
  updated_at: string;
}

// Extended type for display with question info
export interface QuestionStatsWithQuestion extends QuestionStats {
  question_text: string;
  question_order: number;
}

// ============================================
// API Functions
// ============================================

/**
 * Get overall quiz statistics for a specific quiz
 */
export async function getQuizStats(quizId: string): Promise<QuizStats | null> {
  const { data, error } = await supabase
    .from('quiz_stats')
    .select('*')
    .eq('quiz_id', quizId)
    .single();

  if (error) {
    console.error('Error fetching quiz stats:', error);
    return null;
  }

  return data as QuizStats;
}

/**
 * Get question-level statistics for a specific quiz
 */
export async function getQuestionStats(quizId: string): Promise<QuestionStatsWithQuestion[]> {
  // Get question stats
  const { data: stats, error } = await supabase
    .from('question_stats')
    .select('*')
    .eq('quiz_id', quizId)
    .order('question_id', { ascending: true });

  if (error) {
    console.error('Error fetching question stats:', error);
    return [];
  }

  if (!stats || stats.length === 0) {
    return [];
  }

  // Get question text and order for display
  const questionIds = stats.map(s => s.question_id);
  const { data: questions, error: questionError } = await supabase
    .from('quiz_questions')
    .select('id, text, "order"')
    .in('id', questionIds);

  if (questionError) {
    console.error('Error fetching questions:', questionError);
    return stats.map(s => ({
      ...s,
      question_text: 'Question',
      question_order: 0,
    })) as QuestionStatsWithQuestion[];
  }

  // Merge stats with question info
  return stats.map(stat => {
    const question = questions?.find(q => q.id === stat.question_id);
    return {
      ...stat,
      question_text: question?.text?.substring(0, 80) || 'Question',
      question_order: question?.order || 0,
    } as QuestionStatsWithQuestion;
  });
}

/**
 * Get all quiz stats for a teacher's dashboard
 */
export async function getTeacherQuizStats(tenantId: string, quizIds: string[]): Promise<QuizStats[]> {
  if (quizIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('quiz_stats')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('quiz_id', quizIds)
    .order('total_attempts', { ascending: false });

  if (error) {
    console.error('Error fetching teacher quiz stats:', error);
    return [];
  }

  return (data || []) as QuizStats[];
}

/**
 * Calculate difficulty category based on correct percentage
 */
export function getDifficultyLevel(correctPercentage: number): 'easy' | 'medium' | 'hard' {
  if (correctPercentage >= 70) return 'easy';
  if (correctPercentage >= 40) return 'medium';
  return 'hard';
}

/**
 * Format time in seconds to human readable
 */
export function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
