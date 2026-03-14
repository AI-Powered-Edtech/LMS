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
        question_manifest?: string[];
    }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('v1_start_quiz_attempt', {
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

        const { data, error } = await supabase.rpc('v1_submit_quiz_attempt', {
            p_attempt_id: attemptId
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
     * Fetch all results for a specific quiz (teacher/admin only)
     */
    async getQuizResults(quizId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('v1_get_quiz_results', {
            p_quiz_id: quizId
        });

        if (error) {
            console.error('Error fetching quiz results:', error);
            throw new Error(error.message || 'Failed to fetch quiz results');
        }

        return data as Array<{
            attempt_id: string;
            student_id: string;
            student_name: string;
            started_at: string;
            submitted_at: string | null;
            score: number | null;
            status: string;
            passed: boolean | null;
        }>;
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
        let selected_option_ids: string[] = [];
        if (answer.selected_option_ids && answer.selected_option_ids.length > 0) {
            selected_option_ids = answer.selected_option_ids;
        } else if (answer.selected_option_id) {
            selected_option_ids = [answer.selected_option_id];
        }

        const { error } = await supabase.rpc('v1_save_answer', {
            p_attempt_id: attemptId,
            p_question_id: questionId,
            p_selected_option_ids: selected_option_ids,
            p_text_answer: answer.text_answer || null
        });

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

        const promises = answers.map(a => 
            supabase.rpc('v1_save_answer', {
                p_attempt_id: attemptId,
                p_question_id: a.question_id,
                p_selected_option_ids: a.selected_option_ids || [],
                p_text_answer: a.text_answer || null
            })
        );
        
        await Promise.all(promises);
        
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
        // 1. Fetch the attempt to get the question manifest
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts_v2')
            .select('question_manifest')
            .eq('id', attemptId)
            .single();

        if (attemptError) throw attemptError;

        // 2. Fetch answered questions (V2 doesn't prepopulate)
        const { data: answers, error: answersError } = await supabase
            .from('quiz_attempt_questions_v2')
            .select('*')
            .eq('attempt_id', attemptId);

        if (answersError) throw answersError;

        // 3. Fetch all questions from the manifest
        const manifest = attempt.question_manifest || [];
        if (manifest.length === 0) return [];

        const { data: questions, error: qError } = await supabase
            .from('quiz_questions')
            .select(`
                id, text, explanation, "order", question_type, points,
                quiz_options ( id, text, is_correct )
            `)
            .in('id', manifest);

        if (qError) throw qError;

        // Map together following the exact deterministic order of the manifest
        const mappedData: QuizAttemptQuestion[] = manifest.map((qId: string, index: number) => {
            const q = questions.find((x: any) => x.id === qId);
            const a = answers.find((x: any) => x.question_id === qId);
            
            let selected_option_ids: string[] = [];
            let text_answer: string | null = null;
            
            if (a?.student_answers) {
                if (Array.isArray(a.student_answers)) {
                    selected_option_ids = a.student_answers as string[];
                } else if (typeof a.student_answers === 'string') {
                    text_answer = a.student_answers;
                }
            }

            return {
                id: a?.attempt_id ? `${a.attempt_id}-${qId}` : `${attemptId}-${qId}`,
                question_id: qId,
                text: q?.text || '',
                explanation: q?.explanation || null,
                order_index: index,
                question_type: q?.question_type as QuestionType || 'MCQ',
                max_points: q?.points || 0,
                selected_option_id: selected_option_ids.length === 1 ? selected_option_ids[0] : null,
                selected_option_ids,
                text_answer,
                points_earned: a?.points_earned || null,
                is_correct: a?.is_correct ?? null,
                grader_comment: null,
                graded_by: null,
                graded_at: null,
                question_snapshot: {
                    question_id: qId,
                    text: q?.text || '',
                    question_type: q?.question_type as QuestionType || 'MCQ',
                    points: q?.points || 0,
                    explanation: q?.explanation || null,
                    options: (q?.quiz_options || []).map((opt: any) => ({
                        id: opt.id,
                        text: opt.text,
                        is_correct: opt.is_correct,
                        order: opt.order || 0
                    }))
                }
            };
        });

        return mappedData;
    },

    // ────────────────────────────────────────────────────────────
    // Teacher Quiz CRUD (Standalone — no lesson dependency)
    // ────────────────────────────────────────────────────────────

    /**
     * Fetch all quizzes for a specific class (teacher view — all statuses)
     */
    async getQuizzesByClass(classId: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                id, title, status, mode, time_limit_minutes, max_attempts,
                passing_score, created_at, updated_at, available_from, available_until,
                show_correct_answers, shuffle_questions, shuffle_options,
                quiz_questions ( id )
            `)
            .eq('class_id', classId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map(q => ({
            ...q,
            question_count: (q.quiz_questions || []).length,
        }));
    },

    /**
     * Fetch a single quiz with all questions and options (for editing)
     */
    async getQuizWithQuestions(quizId: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id, text, "order", question_type, points, explanation, tenant_id,
                    quiz_options ( id, text, is_correct )
                )
            `)
            .eq('id', quizId)
            .single();

        if (error) throw error;

        // Sort questions
        if (data?.quiz_questions) {
            data.quiz_questions.sort((a: any, b: any) => a.order - b.order);
        }
        return data;
    },

    /**
     * Create a new standalone quiz (not tied to a lesson)
     */
    async createQuiz(payload: {
        title: string;
        class_id: string;
        course_id?: string;
        tenant_id: string;
        instructions?: string;
        mode?: QuizMode;
        time_limit_minutes?: number;
        max_attempts?: number;
        passing_score?: number;
        shuffle_questions?: boolean;
        shuffle_options?: boolean;
        show_correct_answers?: boolean;
        available_from?: string | null;
        available_until?: string | null;
    }) {
        const { data, error } = await supabase
            .from('quizzes')
            .insert({
                title: payload.title,
                class_id: payload.class_id,
                course_id: payload.course_id || null,
                tenant_id: payload.tenant_id,
                instructions: payload.instructions || null,
                mode: payload.mode || 'graded',
                time_limit_minutes: payload.time_limit_minutes || null,
                max_attempts: payload.max_attempts || 3,
                passing_score: payload.passing_score || 70,
                shuffle_questions: payload.shuffle_questions || false,
                shuffle_options: payload.shuffle_options || false,
                show_correct_answers: payload.show_correct_answers || false,
                available_from: payload.available_from || null,
                available_until: payload.available_until || null,
                status: 'draft',
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update quiz settings
     */
    async updateQuiz(quizId: string, updates: Record<string, unknown>) {
        const { error } = await supabase
            .from('quizzes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', quizId);

        if (error) throw error;
    },

    /**
     * Delete a quiz (should be draft only)
     */
    async deleteQuiz(quizId: string) {
        // Delete options → questions → quiz (cascade should handle, but explicit)
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', quizId);

        if (error) throw error;
    },

    /**
     * Publish or unpublish a quiz
     */
    async setQuizStatus(quizId: string, status: 'draft' | 'published') {
        const { error } = await supabase
            .from('quizzes')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', quizId);

        if (error) throw error;
    },

    /**
     * Add a question to a quiz
     */
    async addQuestionToQuiz(
        quizId: string,
        tenantId: string,
        question: {
            text: string;
            question_type: QuestionType;
            points?: number;
            explanation?: string;
            order: number;
            options?: { text: string; is_correct: boolean }[];
        }
    ) {
        const { data: q, error: qErr } = await supabase
            .from('quiz_questions')
            .insert({
                quiz_id: quizId,
                tenant_id: tenantId,
                text: question.text,
                question_type: question.question_type,
                points: question.points || 1,
                explanation: question.explanation || null,
                order: question.order,
            })
            .select()
            .single();

        if (qErr) throw qErr;

        // Insert options if provided
        if (question.options && question.options.length > 0) {
            const { error: oErr } = await supabase
                .from('quiz_options')
                .insert(
                    question.options.map((opt) => ({
                        question_id: q.id,
                        text: opt.text,
                        is_correct: opt.is_correct,
                        tenant_id: tenantId,
                    }))
                );
            if (oErr) throw oErr;
        }

        return q;
    },

    /**
     * Update a question
     */
    async updateQuizQuestion(questionId: string, updates: Record<string, unknown>) {
        const { error } = await supabase
            .from('quiz_questions')
            .update(updates)
            .eq('id', questionId);

        if (error) throw error;
    },

    /**
     * Delete a question and its options
     */
    async deleteQuizQuestion(questionId: string) {
        const { error } = await supabase
            .from('quiz_questions')
            .delete()
            .eq('id', questionId);

        if (error) throw error;
    },

    /**
     * Replace all options for a question (delete + re-insert)
     */
    async replaceQuestionOptions(
        questionId: string,
        tenantId: string,
        options: { text: string; is_correct: boolean }[]
    ) {
        // Delete existing
        await supabase
            .from('quiz_options')
            .delete()
            .eq('question_id', questionId);

        // Insert new
        if (options.length > 0) {
            const { error } = await supabase
                .from('quiz_options')
                .insert(
                    options.map((opt) => ({
                        question_id: questionId,
                        text: opt.text,
                        is_correct: opt.is_correct,
                        tenant_id: tenantId,
                    }))
                );
            if (error) throw error;
        }
    },
};
