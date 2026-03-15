import { supabase } from '../lib/supabase';

export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';
export type QuizMode = 'practice' | 'graded' | 'exam';
export type QuizAttemptStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED' | 'GRADED' | 'ABANDONED';
export type QuizAssignmentStatus = 'draft' | 'active' | 'scheduled' | 'ended';

export interface QuizAssignment {
    id: string;
    quiz_id: string;
    class_id: string;
    tenant_id: string;
    status: QuizAssignmentStatus;
    available_from?: string | null;
    due_at?: string | null;
    max_attempts?: number | null;
    classes?: {
        id?: string;
        name?: string | null;
    } | null;
}

export interface StudentQuizAssignment {
    id: string;
    assignment_id: string;
    quiz_id: string;
    class_id: string;
    class_name: string;
    title: string;
    instructions: string | null;
    mode: QuizMode;
    status: QuizAssignmentStatus;
    available_from?: string | null;
    due_at?: string | null;
    time_limit_minutes: number | null;
    max_attempts: number | null;
    passing_score: number | null;
    show_correct_answers: boolean;
    quiz_questions: Array<{ id: string }>;
    quizzes?: {
        id: string;
        title: string;
        instructions: string | null;
        mode: QuizMode;
        time_limit_minutes: number | null;
        max_attempts: number | null;
        passing_score: number | null;
        show_correct_answers: boolean;
        status: string;
        available_from?: string | null;
        available_until?: string | null;
        quiz_questions?: Array<{ id: string }>;
    } | null;
    classes?: {
        id?: string;
        name?: string | null;
    } | null;
}

export interface QuizOptionSnapshot {
    id: string;
    text: string;
    is_correct?: boolean;
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
    selected_option_id: string | null;
    selected_option_ids: string[];
    text_answer: string | null;
    points_earned: number | null;
    is_correct: boolean | null;
    grader_comment: string | null;
    graded_by: string | null;
    graded_at: string | null;
    quiz_options: QuizOptionSnapshot[];
    question_snapshot: QuestionSnapshot;
}

export interface QuizAttemptResult {
    attempt_id: string;
    status: string;
    score: number;
    passed: boolean | null;
    total_correct: number;
    correct_answers: number;
    total_questions: number;
    time_spent: number;
    has_ungraded: boolean;
    show_correct_answers: boolean;
    version?: number;
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    assignment_id: string | null;
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
    } | null;
    quiz_assignments?: {
        id: string;
        class_id: string;
        classes?: {
            id?: string;
            name?: string | null;
        } | null;
    } | null;
    quiz_attempt_questions?: QuizAttemptQuestion[];
}

export interface AssignmentResultRow {
    attempt_id: string;
    student_id: string;
    student_name: string;
    started_at: string;
    submitted_at: string | null;
    score: number | null;
    status: string;
    passed: boolean | null;
    time_spent: number | null;
    quiz_id: string;
    quiz_title: string;
    passing_score: number;
    max_attempts: number | null;
}

export interface SubmitAnswer {
    question_id: string;
    selected_option_ids: string[];
    text_answer?: string;
}

type StartQuizAttemptInput =
    | string
    | {
        quizId: string;
        assignmentId?: string | null;
    };

type AssignmentUpsertInput = {
    class_id: string;
    available_from?: string;
    due_at?: string;
    max_attempts?: number | null;
};

function deriveAssignmentStatus(
    quizStatus: string,
    availableFrom?: string | null,
    dueAt?: string | null
): QuizAssignmentStatus {
    if (quizStatus !== 'published') return 'draft';

    const now = Date.now();
    if (dueAt && new Date(dueAt).getTime() < now) return 'ended';
    if (availableFrom && new Date(availableFrom).getTime() > now) return 'scheduled';
    return 'active';
}

function normalizeFinalAnswers(answers: SubmitAnswer[]) {
    return answers.map((answer) => ({
        question_id: answer.question_id,
        student_answers:
            answer.text_answer && answer.text_answer.trim().length > 0
                ? answer.text_answer.trim()
                : (answer.selected_option_ids || []),
    }));
}

export const quizService = {
    async startQuizAttempt(input: StartQuizAttemptInput): Promise<{
        attempt_id: string;
        assignment_id?: string | null;
        status: string;
        recovered: boolean;
        expires_at: string | null;
        attempt_number?: number;
        attempt_seed?: string;
        version?: number;
        question_manifest?: string[];
    }> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const quizId = typeof input === 'string' ? input : input.quizId;
        const assignmentId = typeof input === 'string' ? null : (input.assignmentId ?? null);

        const { data, error } = await supabase.rpc('v1_start_quiz_attempt', {
            p_quiz_id: quizId,
            p_assignment_id: assignmentId,
        });

        if (error) {
            console.error('Error starting quiz:', error);
            throw new Error(error.message || 'Failed to start quiz');
        }

        return data as {
            attempt_id: string;
            assignment_id?: string | null;
            status: string;
            recovered: boolean;
            expires_at: string | null;
            attempt_number?: number;
            attempt_seed?: string;
            version?: number;
            question_manifest?: string[];
        };
    },

    async submitQuizAttempt(
        attemptId: string,
        answers: SubmitAnswer[],
        version?: number
    ): Promise<QuizAttemptResult> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('v1_submit_quiz_attempt', {
            p_attempt_id: attemptId,
            p_final_answers: normalizeFinalAnswers(answers),
            p_telemetry_data: version ? { client_version: version } : {},
        });

        if (error) {
            console.error('Error submitting quiz:', error);
            throw new Error(error.message || 'Failed to submit quiz');
        }

        return data as QuizAttemptResult;
    },

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
            p_comment: comment ?? null,
        });

        if (error) {
            console.error('Error grading question:', error);
            throw new Error(error.message || 'Failed to grade question');
        }

        return data as { success: boolean; attempt_question_id: string; points_earned: number; is_correct: boolean };
    },

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

    async getStudentQuizAssignments(tenantId: string): Promise<StudentQuizAssignment[]> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data: enrollments, error: enrollmentError } = await supabase
            .from('enrollments')
            .select('class_id')
            .eq('student_id', session.user.id)
            .eq('tenant_id', tenantId)
            .eq('status', 'ACTIVE');

        if (enrollmentError) throw enrollmentError;

        const classIds = (enrollments || []).map((item) => item.class_id).filter(Boolean);
        if (classIds.length === 0) return [];

        const { data, error } = await supabase
            .from('quiz_assignments')
            .select(`
                id,
                quiz_id,
                class_id,
                status,
                available_from,
                due_at,
                classes!inner (
                    id,
                    name
                ),
                quizzes!inner (
                    id,
                    title,
                    instructions,
                    mode,
                    time_limit_minutes,
                    max_attempts,
                    passing_score,
                    show_correct_answers,
                    status,
                    available_from,
                    available_until,
                    quiz_questions ( id )
                )
            `)
            .eq('tenant_id', tenantId)
            .in('class_id', classIds)
            .eq('quizzes.status', 'published')
            .eq('status', 'active')
            .order('available_from', { ascending: true });

        if (error) throw error;

        return (data || []).map((assignment: any) => {
            const quiz = assignment.quizzes || {};
            return {
                id: assignment.id,
                assignment_id: assignment.id,
                quiz_id: assignment.quiz_id,
                class_id: assignment.class_id,
                class_name: assignment.classes?.name || 'Kelas',
                title: quiz.title || 'Kuis',
                instructions: quiz.instructions || null,
                mode: (quiz.mode || 'graded') as QuizMode,
                status: assignment.status,
                available_from: assignment.available_from ?? quiz.available_from ?? null,
                due_at: assignment.due_at ?? quiz.available_until ?? null,
                time_limit_minutes: quiz.time_limit_minutes ?? null,
                max_attempts: assignment.max_attempts ?? quiz.max_attempts ?? null,
                passing_score: quiz.passing_score ?? null,
                show_correct_answers: quiz.show_correct_answers ?? false,
                quiz_questions: quiz.quiz_questions || [],
                quizzes: quiz,
                classes: assignment.classes,
            };
        });
    },

    async getAllQuizzes(tenantId: string) {
        return this.getStudentQuizAssignments(tenantId);
    },

    async getUserAttempts(tenantId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase
            .from('quiz_attempts_v2')
            .select(`
                *,
                quizzes (
                    title,
                    passing_score,
                    mode,
                    show_correct_answers
                ),
                quiz_assignments:assignment_id (
                    id,
                    class_id,
                    classes (
                        id,
                        name
                    )
                )
            `)
            .eq('student_id', session.user.id)
            .eq('tenant_id', tenantId)
            .order('started_at', { ascending: false });

        if (error) throw error;
        return (data || []) as QuizAttempt[];
    },

    async getAssignmentResults(assignmentId: string) {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('v1_get_assignment_results', {
            p_assignment_id: assignmentId,
        });

        if (error) {
            console.error('Error fetching assignment results:', error);
            throw new Error(error.message || 'Failed to fetch assignment results');
        }

        return (data || []) as AssignmentResultRow[];
    },

    async saveQuizAnswer(
        attemptId: string,
        questionId: string,
        answer: { selected_option_ids?: string[]; text_answer?: string; selected_option_id?: string }
    ) {
        let selectedOptionIds: string[] = [];
        if (answer.selected_option_ids && answer.selected_option_ids.length > 0) {
            selectedOptionIds = answer.selected_option_ids;
        } else if (answer.selected_option_id) {
            selectedOptionIds = [answer.selected_option_id];
        }

        const { error } = await supabase.rpc('v1_save_answer', {
            p_attempt_id: attemptId,
            p_question_id: questionId,
            p_selected_option_ids: selectedOptionIds,
            p_text_answer: answer.text_answer || null,
        });

        if (error) {
            console.error('Error saving quiz answer:', error);
            throw error;
        }

        return true;
    },

    async batchSaveAnswers(attemptId: string, answers: SubmitAnswer[]): Promise<boolean> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const promises = answers.map((answer) =>
            supabase.rpc('v1_save_answer', {
                p_attempt_id: attemptId,
                p_question_id: answer.question_id,
                p_selected_option_ids: answer.selected_option_ids || [],
                p_text_answer: answer.text_answer || null,
            })
        );

        await Promise.all(promises);
        return true;
    },

    async getActiveAttempt(
        quizId: string,
        tenantId: string,
        assignmentId?: string | null
    ): Promise<QuizAttempt | null> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        let query = supabase
            .from('quiz_attempts_v2')
            .select(`
                *,
                quizzes (
                    title,
                    passing_score,
                    mode,
                    show_correct_answers
                ),
                quiz_assignments:assignment_id (
                    id,
                    class_id,
                    classes (
                        id,
                        name
                    )
                )
            `)
            .eq('student_id', session.user.id)
            .eq('tenant_id', tenantId)
            .eq('status', 'IN_PROGRESS');

        if (assignmentId) {
            query = query.eq('assignment_id', assignmentId);
        } else if (quizId !== 'all') {
            query = query.eq('quiz_id', quizId).is('assignment_id', null);
        }

        const { data, error } = await query
            .order('started_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) throw error;
        return data as QuizAttempt | null;
    },

    async recordCheatingSignal(attemptId: string, signalType: string, metadata: Record<string, unknown> = {}) {
        const { error } = await supabase.rpc('record_cheating_signal', {
            p_attempt_id: attemptId,
            p_signal_type: signalType,
            p_metadata: metadata,
        });

        if (error) {
            console.error('Error recording cheating signal:', error);
        }
    },

    async recordHeartbeat(attemptId: string): Promise<boolean> {
        const { data, error } = await supabase.rpc('record_quiz_heartbeat', {
            p_attempt_id: attemptId,
        });

        if (error) {
            console.error('Heartbeat error:', error);
            return false;
        }

        return !!data;
    },

    async getAttemptQuestions(attemptId: string) {
        const { data: attempt, error: attemptError } = await supabase
            .from('quiz_attempts_v2')
            .select('question_manifest')
            .eq('id', attemptId)
            .single();

        if (attemptError) throw attemptError;

        const { data: answers, error: answersError } = await supabase
            .from('quiz_attempt_questions_v2')
            .select('*')
            .eq('attempt_id', attemptId);

        if (answersError) throw answersError;

        const manifest = attempt.question_manifest || [];
        if (manifest.length === 0) return [];

        const { data: questions, error: questionError } = await supabase
            .from('quiz_questions')
            .select(`
                id,
                text,
                explanation,
                "order",
                question_type,
                points,
                quiz_options ( id, text )
            `)
            .in('id', manifest);

        if (questionError) throw questionError;

        return manifest.map((questionId: string, index: number) => {
            const question = questions.find((item: any) => item.id === questionId);
            const answer = answers.find((item: any) => item.question_id === questionId);

            let selectedOptionIds: string[] = [];
            let textAnswer: string | null = null;

            if (answer?.student_answers) {
                if (Array.isArray(answer.student_answers)) {
                    selectedOptionIds = answer.student_answers as string[];
                } else if (typeof answer.student_answers === 'string') {
                    textAnswer = answer.student_answers;
                }
            }

            // Service-layer normalization: map quiz_options to a flat property
            // so QuizBody.tsx can read question.quiz_options directly
            const normalizedOptions = (question?.quiz_options || []).map((option: any, optionIndex: number) => ({
                id: option.id,
                text: option.text,
                order: option.order || optionIndex,
            }));

            return {
                id: answer?.attempt_id ? `${answer.attempt_id}-${questionId}` : `${attemptId}-${questionId}`,
                question_id: questionId,
                text: question?.text || '',
                explanation: question?.explanation || null,
                order_index: index,
                question_type: (question?.question_type as QuestionType) || 'MCQ',
                max_points: question?.points || 0,
                selected_option_id: selectedOptionIds.length === 1 ? selectedOptionIds[0] : null,
                selected_option_ids: selectedOptionIds,
                text_answer: textAnswer,
                points_earned: answer?.points_earned || null,
                is_correct: answer?.is_correct ?? null,
                grader_comment: null,
                graded_by: null,
                graded_at: null,
                // Exposed for QuizBody.tsx to render ABCD options
                quiz_options: normalizedOptions,
                question_snapshot: {
                    question_id: questionId,
                    text: question?.text || '',
                    question_type: (question?.question_type as QuestionType) || 'MCQ',
                    points: question?.points || 0,
                    explanation: question?.explanation || null,
                    options: normalizedOptions,
                },
            } satisfies QuizAttemptQuestion;
        });
    },

    async getQuizzesByClass(classId: string) {
        const { data, error } = await supabase
            .from('quiz_assignments')
            .select(`
                *,
                quizzes (
                    id,
                    title,
                    status,
                    mode,
                    time_limit_minutes,
                    max_attempts,
                    passing_score,
                    created_at,
                    updated_at,
                    available_from,
                    available_until,
                    show_correct_answers,
                    shuffle_questions,
                    shuffle_options,
                    quiz_questions ( id )
                )
            `)
            .eq('class_id', classId)
            .order('available_from', { ascending: false });

        if (error) throw error;

        return (data || []).map((assignment: any) => ({
            ...(assignment.quizzes || {}),
            assignment_id: assignment.id,
            assignment_status: assignment.status,
            assignment_available_from: assignment.available_from,
            assignment_due_at: assignment.due_at,
            question_count: (assignment.quizzes?.quiz_questions || []).length,
        }));
    },

    async getTeacherQuizzes(tenantId: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_assignments ( id, class_id ),
                quiz_questions ( id )
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((quiz: any) => ({
            ...quiz,
            assignment_count: (quiz.quiz_assignments || []).length,
            question_count: (quiz.quiz_questions || []).length,
        }));
    },

    async assignQuizToClasses(
        quizId: string,
        tenantId: string,
        assignments: AssignmentUpsertInput[]
    ) {
        const { data: { user } } = await supabase.auth.getUser();

        const { data: quiz, error: quizError } = await supabase
            .from('quizzes')
            .select('status, max_attempts')
            .eq('id', quizId)
            .single();

        if (quizError) throw quizError;

        const rows = assignments.map((assignment) => ({
            quiz_id: quizId,
            class_id: assignment.class_id,
            tenant_id: tenantId,
            assigned_by: user?.id ?? null,
            available_from: assignment.available_from ?? null,
            due_at: assignment.due_at ?? null,
            max_attempts: assignment.max_attempts ?? quiz.max_attempts ?? null,
            status: deriveAssignmentStatus(quiz.status, assignment.available_from, assignment.due_at),
        }));

        const { error } = await supabase
            .from('quiz_assignments')
            .upsert(rows, { onConflict: 'quiz_id,class_id' });

        if (error) throw error;
    },

    async getAssignmentsByClass(classId: string) {
        const { data, error } = await supabase
            .from('quiz_assignments')
            .select(`
                *,
                classes (
                    id,
                    name
                ),
                quizzes (
                    id,
                    title,
                    mode,
                    passing_score,
                    status,
                    time_limit_minutes,
                    max_attempts,
                    quiz_questions (id)
                )
            `)
            .eq('class_id', classId);

        if (error) throw error;
        return data;
    },

    async getAssignmentsByQuiz(quizId: string) {
        const { data, error } = await supabase
            .from('quiz_assignments')
            .select(`
                *,
                classes (
                    id,
                    name
                )
            `)
            .eq('quiz_id', quizId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data as QuizAssignment[];
    },

    async updateQuizAssignment(assignmentId: string, updates: Record<string, unknown>) {
        const normalizedUpdates = { ...updates } as Record<string, unknown>;
        if ('available_until' in normalizedUpdates && !('due_at' in normalizedUpdates)) {
            normalizedUpdates.due_at = normalizedUpdates.available_until;
            delete normalizedUpdates.available_until;
        }

        const { error } = await supabase
            .from('quiz_assignments')
            .update(normalizedUpdates)
            .eq('id', assignmentId);

        if (error) throw error;
    },

    async removeQuizAssignment(assignmentId: string) {
        const { error } = await supabase
            .from('quiz_assignments')
            .delete()
            .eq('id', assignmentId);

        if (error) throw error;
    },

    async getQuizWithQuestions(quizId: string) {
        const { data, error } = await supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id,
                    text,
                    "order",
                    question_type,
                    points,
                    explanation,
                    tenant_id,
                    quiz_options ( id, text, is_correct )
                )
            `)
            .eq('id', quizId)
            .single();

        if (error) throw error;

        if (data?.quiz_questions) {
            data.quiz_questions.sort((a: any, b: any) => a.order - b.order);
        }

        return data;
    },

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
        due_at?: string | null;
        available_until?: string | null;
    }) {
        const dueAt = payload.due_at ?? payload.available_until ?? null;

        const { data, error } = await supabase
            .from('quizzes')
            .insert({
                title: payload.title,
                origin_class_id: payload.class_id,
                class_id: null,
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
                available_until: dueAt,
                status: 'draft',
            })
            .select()
            .single();

        if (error) throw error;

        const { error: assignError } = await supabase
            .from('quiz_assignments')
            .upsert({
                quiz_id: data.id,
                class_id: payload.class_id,
                tenant_id: payload.tenant_id,
                available_from: payload.available_from || null,
                due_at: dueAt,
                max_attempts: payload.max_attempts || 3,
                status: 'draft',
            }, { onConflict: 'quiz_id,class_id' });

        if (assignError) {
            console.error('Failed to auto-create quiz assignment:', assignError);
            throw assignError;
        }

        return data;
    },

    async updateQuiz(quizId: string, updates: Record<string, unknown>) {
        const { error } = await supabase
            .from('quizzes')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', quizId);

        if (error) throw error;
    },

    async deleteQuiz(quizId: string) {
        const { error } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', quizId);

        if (error) throw error;
    },

    async setQuizStatus(quizId: string, status: 'draft' | 'published') {
        const { error } = await supabase
            .from('quizzes')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', quizId);

        if (error) throw error;

        const { data: assignments, error: assignmentError } = await supabase
            .from('quiz_assignments')
            .select('id, available_from, due_at')
            .eq('quiz_id', quizId);

        if (assignmentError) throw assignmentError;

        if (!assignments || assignments.length === 0) return;

        await Promise.all(
            assignments.map((assignment) =>
                supabase
                    .from('quiz_assignments')
                    .update({
                        status: deriveAssignmentStatus(status, assignment.available_from, assignment.due_at),
                    })
                    .eq('id', assignment.id)
            )
        );
    },

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
        const { data: questionRow, error: questionError } = await supabase
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

        if (questionError) throw questionError;

        if (question.options && question.options.length > 0) {
            const { error: optionError } = await supabase
                .from('quiz_options')
                .insert(
                    question.options.map((option) => ({
                        question_id: questionRow.id,
                        text: option.text,
                        is_correct: option.is_correct,
                        tenant_id: tenantId,
                    }))
                );

            if (optionError) throw optionError;
        }

        return questionRow;
    },

    async updateQuizQuestion(questionId: string, updates: Record<string, unknown>) {
        const { error } = await supabase
            .from('quiz_questions')
            .update(updates)
            .eq('id', questionId);

        if (error) throw error;
    },

    async deleteQuizQuestion(questionId: string) {
        const { error } = await supabase
            .from('quiz_questions')
            .delete()
            .eq('id', questionId);

        if (error) throw error;
    },

    async replaceQuestionOptions(
        questionId: string,
        tenantId: string,
        options: { text: string; is_correct: boolean }[]
    ) {
        await supabase
            .from('quiz_options')
            .delete()
            .eq('question_id', questionId);

        if (options.length > 0) {
            const { error } = await supabase
                .from('quiz_options')
                .insert(
                    options.map((option) => ({
                        question_id: questionId,
                        text: option.text,
                        is_correct: option.is_correct,
                        tenant_id: tenantId,
                    }))
                );

            if (error) throw error;
        }
    },
};
