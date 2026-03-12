import { supabase } from '../lib/supabase';

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';
export type QuizMode = 'practice' | 'graded' | 'exam';
export type QuizAttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED' | 'ABANDONED';

export interface QuizOptionSnapshot {
    id: string;
    text: string;
    is_correct: boolean;
    order: number;
}

export interface QuestionSnapshot {
    question_id: string;
    text: string;
    question_type: QuestionType;
    points: number;
    explanation: string | null;
    options: QuizOptionSnapshot[];
}

export interface QuizAttemptQuestion {
    id: string;
    question_id: string;
    text: string;
    explanation: string | null;
    order_index: number;
    question_type: QuestionType;
    max_points: number;
    // Answers
    selected_option_id: string | null;
    selected_option_ids: string[];
    text_answer: string | null;
    // Grading
    points_earned: number | null;
    is_correct: boolean | null;
    grader_comment: string | null;
    graded_by: string | null;
    graded_at: string | null;
    // Snapshot
    question_snapshot: QuestionSnapshot;
}

export interface QuizAttemptResult {
    attempt_id: string;
    status: string;
    score: number;
    passed: boolean | null;
    total_correct: number;
    total_questions: number;
    time_spent: number;
    has_ungraded: boolean;
    show_correct_answers: boolean;
    version?: number;
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    student_id: string;
    tenant_id: string;
    status: QuizAttemptStatus;
    score: number | null;
    passed: boolean | null;
    started_at: string;
    submitted_at: string | null;
    finished_at: string | null;
    expires_at: string | null;
    time_spent: number | null;
    attempt_number: number;
    attempt_seed: string | null;
    version?: number;
    quizzes?: {
        title: string;
        passing_score: number;
        mode: QuizMode;
        show_correct_answers: boolean;
    };
    quiz_attempt_questions?: QuizAttemptQuestion[];
}

export interface SubmitAnswer {
    question_id: string;
    selected_option_ids: string[];
    text_answer?: string;
}

// ────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────

export const quizService = {
    /**
     * Start a quiz attempt via RPC
     */
    async startQuizAttempt(quizId: string): Promise<{
        attempt_id: string;
        status: string;
        recovered: boolean;
        expires_at: string | null;
        attempt_number?: number;
        version?: number;
    }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('start_quiz_attempt', {
            p_quiz_id: quizId
        });

        if (error) {
            console.error('Error starting quiz:', error);
            throw new Error(error.message || 'Failed to start quiz');
        }

        return data as {
            attempt_id: string;
            status: string;
            recovered: boolean;
            expires_at: string | null;
            attempt_number?: number;
            version?: number;
        };
    },

    /**
     * Submit quiz answers and evaluate via RPC
     * NOTE: New signature uses attempt_id (not quiz_id)
     */
    async submitQuizAttempt(
        attemptId: string,
        answers: SubmitAnswer[],
        version?: number
    ): Promise<QuizAttemptResult> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('submit_quiz_attempt', {
            p_attempt_id: attemptId,
            p_answers: answers,
            p_version: version ?? null
        });

        if (error) {
            console.error('Error submitting quiz:', error);
            throw new Error(error.message || 'Failed to submit quiz');
        }

        return data as QuizAttemptResult;
    },

    /**
     * Grade a single attempt question (teacher/admin only)
     */
    async gradeAttemptQuestion(
        attemptQuestionId: string,
        pointsEarned: number,
        isCorrect: boolean,
        comment?: string
    ): Promise<{ success: boolean; attempt_question_id: string; points_earned: number; is_correct: boolean }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('grade_attempt_question', {
            p_attempt_question_id: attemptQuestionId,
            p_points_earned: pointsEarned,
            p_is_correct: isCorrect,
            p_comment: comment ?? null
        });

        if (error) {
            console.error('Error grading question:', error);
            throw new Error(error.message || 'Failed to grade question');
        }

        return data as { success: boolean; attempt_question_id: string; points_earned: number; is_correct: boolean };
    },

    /**
     * Fetch quizzes for a course (published only)
     */
    async getQuizzesByCourse(courseId: string, tenantId: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id, text, "order", question_type, points,
                    quiz_options (id, text)
                )
            `)
            .eq('course_id', courseId)
            .eq('tenant_id', tenantId)
            .eq('status', 'published');

        if (error) throw error;
        return data;
    },

    /**
     * Fetch all quizzes available for the user (in their tenant)
     */
    async getAllQuizzes(tenantId: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id, text, "order", question_type, points,
                    quiz_options (id, text)
                )
            `)
            .eq('tenant_id', tenantId)
            .eq('status', 'published');

        if (error) throw error;
        return data;
    },

    /**
     * Fetch all quiz attempts for the current user
     */
    async getUserAttempts(tenantId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('quiz_attempts')
            .select(`
                *,
                quizzes (
                    title, passing_score, mode, show_correct_answers
                )
            `)
            .eq('student_id', session.user.id)
            .eq('tenant_id', tenantId)
            .order('started_at', { ascending: false });

        if (error) throw error;
        return data as QuizAttempt[];
    },

    /**
     * Save/Update an answer for a specific question in an attempt.
     * Supports both option-based and text-based answers.
     */
    async saveQuizAnswer(
        attemptId: string,
        questionId: string,
        answer: { selected_option_ids?: string[]; text_answer?: string; selected_option_id?: string }
    ) {
        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString()
        };

        // Support legacy single option_id for backward compat
        if (answer.selected_option_id) {
            updatePayload.selected_option_id = answer.selected_option_id;
            updatePayload.selected_option_ids = [answer.selected_option_id];
        }
        if (answer.selected_option_ids) {
            updatePayload.selected_option_ids = answer.selected_option_ids;
            // Also set legacy field if single selection
            if (answer.selected_option_ids.length === 1) {
                updatePayload.selected_option_id = answer.selected_option_ids[0];
            }
        }
        if (answer.text_answer !== undefined) {
            updatePayload.text_answer = answer.text_answer;
        }

        const { error } = await supabase
            .from('quiz_attempt_questions')
            .update(updatePayload)
            .eq('attempt_id', attemptId)
            .eq('question_id', questionId);

        if (error) {
            console.error('Error saving quiz answer:', error);
            throw error;
        }
        return true;
    },

    /**
     * Save/Update answers in batch (for AnswerBuffer support)
     */
    async batchSaveAnswers(
        attemptId: string,
        answers: SubmitAnswer[]
    ): Promise<boolean> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { error } = await supabase.rpc('batch_save_answers', {
            p_attempt_id: attemptId,
            p_answers: answers
        });

        if (error) {
            console.error('Error batch saving answers:', error);
            throw error;
        }
        return true;
    },

    /**
     * Get the active attempt for a specific quiz and student
     */
    async getActiveAttempt(quizId: string, tenantId: string): Promise<QuizAttempt | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        let query = supabase
            .from('quiz_attempts')
            .select(`
                *,
                quizzes (
                    title, passing_score, mode, show_correct_answers
                )
            `)
            .eq('student_id', session.user.id)
            .eq('tenant_id', tenantId)
            .eq('status', 'IN_PROGRESS');

        if (quizId !== 'all') {
            query = query.eq('quiz_id', quizId);
        }

        const { data, error } = await query
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data as QuizAttempt;
    },

    /**
     * Log a passive cheating signal (tab switch, focus loss)
     */
    async recordCheatingSignal(attemptId: string, signalType: string, metadata: Record<string, unknown> = {}) {
        const { error } = await supabase.rpc('record_cheating_signal', {
            p_attempt_id: attemptId,
            p_signal_type: signalType,
            p_metadata: metadata
        });

        if (error) {
            console.error('Error recording cheating signal:', error);
        }
    },

    async recordHeartbeat(attemptId: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('record_quiz_heartbeat', {
            p_attempt_id: attemptId
        });
        if (error) {
            console.error('Heartbeat error:', error);
            return false;
        }
        return !!data;
    },

    /**
     * Fetch questions snapshot for a specific attempt.
     * Returns multi-type question data including snapshot, types, and answer fields.
     */
    async getAttemptQuestions(attemptId: string) {
        const { data, error } = await supabase
            .from('quiz_attempt_questions')
            .select(`
                id, question_id, text, explanation, order_index,
                question_type, max_points,
                selected_option_id, selected_option_ids, text_answer,
                points_earned, is_correct, grader_comment,
                question_snapshot
            `)
            .eq('attempt_id', attemptId)
            .order('order_index', { ascending: true });

        if (error) {
            console.error('Error fetching attempt questions:', error);
            throw error;
        }
        return data as QuizAttemptQuestion[];
    },
};
