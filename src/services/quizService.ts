import { supabase } from '../lib/supabase';

export interface QuizAttemptResult {
    attempt_id: string;
    score: number;
    passed: boolean;
    correct_answers: number;
    total_questions: number;
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    student_id: string;
    tenant_id: string;
    status: 'in_progress' | 'submitted' | 'graded' | 'expired';
    score: number | null;
    passed: boolean | null;
    started_at: string;
    submitted_at: string | null;
    finished_at: string | null;
    time_spent: number | null;
    quizzes?: {
        title: string;
        total_points: number;
        passing_score: number;
    };
}

export const quizService = {
    /**
     * Start a quiz attempt by setting status to in_progress
     */
    async startQuizAttempt(quizId: string): Promise<{ attempt_id: string; status: string }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('start_quiz_attempt', {
            p_quiz_id: quizId
        });

        if (error) {
            console.error('Error starting quiz:', error);
            throw new Error(error.message || 'Failed to start quiz');
        }

        return data as { attempt_id: string; status: string };
    },

    /**
     * Submit quiz choices and evaluate via PostgreSQL RPC transaction
     */
    async submitQuizAttempt(
        quizId: string,
        answers: { question_id: string; option_id: string }[]
    ): Promise<QuizAttemptResult> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('submit_quiz_attempt', {
            p_quiz_id: quizId,
            p_answers: answers
        });

        if (error) {
            console.error('Error submitting quiz:', error);
            throw new Error(error.message || 'Failed to submit quiz');
        }

        return data as QuizAttemptResult;
    },

    /**
     * Fetch quizzes for a course
     */
    async getQuizzesByCourse(courseId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id, text, "order",
                    quiz_options (id, text)
                )
            `)
            .eq('course_id', courseId)
            .eq('status', 'published');

        if (error) throw error;
        return data;
    },

    /**
     * Fetch all quizzes available for the user (in their tenant)
     */
    async getAllQuizzes() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id, text, "order",
                    quiz_options (id, text)
                )
            `)
            .eq('status', 'published');

        if (error) throw error;
        return data;
    },

    /**
     * Fetch all quiz attempts for the current user
     */
    async getUserAttempts() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('quiz_attempts')
            .select(`
                *,
                quizzes (
                    title, total_points, passing_score
                )
            `)
            .eq('student_id', session.user.id)
            .order('submitted_at', { ascending: false });

        if (error) throw error;
        return data;
    }
};
