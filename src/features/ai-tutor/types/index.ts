/**
 * AI Tutor Types
 * 
 * Consolidated types for the AI Tutor feature module.
 */

import { supabase } from "@/src/lib/supabase";

// Re-export supabase for convenience
export { supabase };

// ─── Core Types ───

export type DifficultyLevel = 'mastering' | 'progressing' | 'struggling' | 'not_started';

export interface AITutorMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface AITutorResponse {
    response: string;
    difficulty: DifficultyLevel;
    signals: string[];
    session_id: string;
}

export interface RateLimitInfo {
    remaining: number;
    resetsAt: Date;
    isLimited: boolean;
}

export interface AITutorError {
    message: string;
    code?: string;
    retryAfter?: number;
}

// ─── Prompt Builder Types ───

export interface TutorContext {
    lesson: {
        id: string;
        title: string;
        module_title: string;
        course_title: string;
        position_in_module: number;
    } | null;
    resources: Array<{
        type: string;
        content_summary: string;
    }>;
    progress: {
        last_position_seconds: number;
        progress_percent: number;
        is_completed: boolean;
    } | null;
    recent_quiz: {
        score: number;
        max_score: number;
    } | null;
    student_profile: {
        total_lessons_completed: number;
        avg_progress: number;
        total_lessons_started: number;
    } | null;
}

export interface StudentDifficulty {
    level: DifficultyLevel;
    confidence: number;
    signals: string[];
}

export interface PromptMessage {
    role: 'system' | 'user';
    content: string;
}

// ─── Service Options ───

export interface AskTutorOptions {
    lessonId: string;
    question: string;
    tenantId: string;
    sessionId?: string;
}
