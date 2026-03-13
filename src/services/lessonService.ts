import { supabase } from '../lib/supabase';

// ============================================================
// Types
// ============================================================

export interface LessonResource {
    id: string;
    lesson_id: string;
    type: string;        // 'VIDEO' | 'PDF' | 'LINK' | 'IMAGE' | 'DOCUMENT'
    url: string;
    title: string | null;
    content: string | null;
    metadata: Record<string, unknown>;
}

export interface QuizOption {
    id: string;
    text: string;
    is_correct?: boolean; // Only available server-side
}

export interface QuizQuestion {
    id: string;
    text: string;
    order: number;
    quiz_options: QuizOption[];
}

export interface Assignment {
    id: string;
    tenant_id: string;
    course_id: string;
    lesson_id: string;
    title: string;
    instructions: string | null;
    max_points: number;
    max_attempts: number;
    is_published: boolean;
    due_date: string | null;
    created_at: string;
}

export interface Quiz {
    id: string;
    lesson_id: string | null;
    title: string;
    instructions: string | null;
    time_limit_minutes: number | null;
    max_attempts: number;
    quiz_questions: QuizQuestion[];
}

export interface Lesson {
    id: string;
    module_id: string;
    title: string;
    content: string | null;
    type: string;
    order: number;
    passing_score: number | null;
    is_published: boolean;
    duration_minutes: number | null;
    tenant_id: string;
    course_id: string; // From join
    lesson_resources: LessonResource[];
    quizzes: Quiz[];
    assignments?: Assignment[];
}

export interface LessonProgress {
    id: string;
    user_id: string;
    lesson_id: string;
    status: string;
    progress_percentage: number;
    last_position: number | null;
    completed: boolean;
    completed_at: string | null;
}

export interface ProgressQueueItem {
    lessonId: string;
    status: 'started' | 'in_progress' | 'completed';
    progressPercentage: number;
    lastPosition: number | null;
    timestamp: number;
}

export interface QuizGradeResult {
    score: number;
    passed: boolean;
    correct_count: number;
    total_questions: number;
    passing_score: number;
    attempt_number: number;
    graded_answers: {
        question_id: string;
        selected_option_id: string;
        is_correct: boolean;
    }[];
}

// ============================================================
// Service
// ============================================================

export const lessonService = {
    /**
     * Fetch a single lesson with its resources and quiz questions.
     * Quiz options are fetched WITHOUT is_correct (client-safe).
     */
    async fetchLesson(lessonId: string, tenantId: string): Promise<Lesson | null> {
        const { data, error } = await supabase
            .from('lessons')
            .select(`
        id, module_id, title, content, type, order,
        passing_score, is_published, duration_minutes, tenant_id,
        course_modules (course_id),
        lesson_resources (id, lesson_id, type, url, title, content, metadata),
        quizzes (
          id, lesson_id, title, instructions, time_limit_minutes, max_attempts,
          quiz_questions (
            id, text, order,
            quiz_options (id, text)
          )
        )
      `)
            .eq('id', lessonId)
            .eq('tenant_id', tenantId)
            .single();

        if (error) {
            console.error('Error fetching lesson:', error);
            return null;
        }

        // Flatten course_id
        const lesson = {
            ...data,
            course_id: (data as any).course_modules?.course_id
        };

        return lesson as unknown as Lesson;
    },

    /**
     * Fetch all lessons in a module with the current user's progress.
     */
    async fetchModuleLessons(moduleId: string, userId: string, tenantId: string): Promise<{
        lessons: Lesson[];
        progress: Record<string, LessonProgress>;
    }> {
        // Fetch lessons
        const { data: lessons, error: lessonsError } = await supabase
            .from('lessons')
            .select(`
        id, module_id, title, content, type, order,
        passing_score, is_published, duration_minutes, tenant_id,
        lesson_resources (id, lesson_id, type, url, title, content, metadata),
        quizzes (
          id, lesson_id, title, instructions, time_limit_minutes, max_attempts,
          quiz_questions (id, text, order, quiz_options (id, text))
        )
      `)
            .eq('module_id', moduleId)
            .eq('tenant_id', tenantId)
            .order('order');

        if (lessonsError) {
            console.error('Error fetching module lessons:', lessonsError);
            return { lessons: [], progress: {} };
        }

        // Fetch progress for all lessons in this module
        const lessonIds = (lessons || []).map(l => l.id);
        const { data: progressData, error: progressError } = await supabase
            .from('lesson_progress')
            .select('id, user_id, lesson_id, status, progress_percentage, last_position, completed, completed_at')
            .eq('user_id', userId)
            .in('lesson_id', lessonIds);

        if (progressError) {
            console.error('Error fetching lesson progress:', progressError);
        }

        // Index progress by lesson_id
        const progress: Record<string, LessonProgress> = {};
        for (const p of (progressData || [])) {
            progress[p.lesson_id] = p as LessonProgress;
        }

        return {
            lessons: (lessons || []) as unknown as Lesson[],
            progress,
        };
    },

    /**
     * Update lesson progress (monotonic — progress can only go UP).
     * Uses the server-side RPC function for safety.
     * Throws an error if network fails.
     */
    async updateProgress(
        lessonId: string,
        tenantId: string,
        status: 'started' | 'in_progress' | 'completed',
        progressPercentage: number,
        lastPosition?: number
    ): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error } = await supabase.rpc('update_lesson_progress_monotonic', {
            p_user_id: user.id,
            p_lesson_id: lessonId,
            p_tenant_id: tenantId,
            p_status: status,
            p_progress_percentage: progressPercentage,
            p_last_position: lastPosition ?? null,
        });

        if (error) {
            console.error('Error updating progress:', error);
            throw error;
        }
    },

    /**
     * Queue a progress update. Uses updateProgress first, and if it fails
     * (e.g. offline), it adds the update to a deduplicated local queue.
     */
    async queueProgressUpdate(
        lessonId: string,
        tenantId: string,
        status: 'started' | 'in_progress' | 'completed',
        progressPercentage: number,
        lastPosition?: number
    ): Promise<void> {
        try {
            await this.updateProgress(lessonId, tenantId, status, progressPercentage, lastPosition);
        } catch (error) {
            console.warn('[Offline Queue] Network error, queuing progress for lesson', lessonId);

            // Note: We don't save tenantId or userId in queue for security.
            // Server validates session when queue is flushed.
            const queueKey = 'edusync_progress_queue';
            const rawQueue = localStorage.getItem(queueKey);
            let queue: ProgressQueueItem[] = rawQueue ? JSON.parse(rawQueue) : [];

            const existingIndex = queue.findIndex(item => item.lessonId === lessonId);
            const position = lastPosition ?? null;

            if (existingIndex >= 0) {
                // Deduplicate: Keep the maximum progress/position
                const existing = queue[existingIndex];
                queue[existingIndex] = {
                    ...existing,
                    status: (existing.status === 'completed' || status === 'completed') ? 'completed' : status,
                    progressPercentage: Math.max(existing.progressPercentage, progressPercentage),
                    lastPosition: Math.max(existing.lastPosition || 0, position || 0),
                    timestamp: Date.now()
                };
            } else {
                queue.push({
                    lessonId,
                    status,
                    progressPercentage,
                    lastPosition: position,
                    timestamp: Date.now()
                });
            }

            // Limit queue size to prevent unbounded growth
            if (queue.length > 20) {
                // Sort by timestamp descending and keep newest 20
                queue.sort((a, b) => b.timestamp - a.timestamp);
                queue = queue.slice(0, 20);
            }

            localStorage.setItem(queueKey, JSON.stringify(queue));
        }
    },

    /**
     * Attempts to flush the offline progress queue synchronously.
     * Prevents race conditions by using a sequential loop and a memory-level lock.
     */
    async processOfflineQueue(tenantId: string): Promise<void> {
        // Mutex lock to prevent race conditions during component remounts / online events
        if ((this as any)._isProcessingOfflineQueue) return;
        (this as any)._isProcessingOfflineQueue = true;

        try {
            const queueKey = 'edusync_progress_queue';
            const rawQueue = localStorage.getItem(queueKey);
            if (!rawQueue) return;

            let queue: ProgressQueueItem[] = [];
            try {
                queue = JSON.parse(rawQueue);
            } catch {
                localStorage.removeItem(queueKey);
                return;
            }

            if (queue.length === 0) return;

            const remainingQueue: ProgressQueueItem[] = [];
            // Important: Flush sequentially
            for (const item of queue) {
                try {
                    await this.updateProgress(
                        item.lessonId,
                        tenantId,
                        item.status,
                        item.progressPercentage,
                        item.lastPosition || undefined
                    );
                } catch (err) {
                    console.warn('[Offline Queue] Failed to sync item, re-queuing', item.lessonId);
                    remainingQueue.push(item);
                }
            }

            if (remainingQueue.length > 0) {
                localStorage.setItem(queueKey, JSON.stringify(remainingQueue));
            } else {
                localStorage.removeItem(queueKey);
                console.log('[Offline Queue] Fluhed successfully');
            }
        } finally {
            (this as any)._isProcessingOfflineQueue = false;
        }
    },

    /**
     * Mark a lesson as completed.
     * Convenience wrapper around updateProgress.
     */
    async completeLesson(lessonId: string, tenantId: string): Promise<void> {
        await this.updateProgress(lessonId, tenantId, 'completed', 100);
    },

    /**
     * Submit quiz answers for server-side grading via Edge Function.
     * Answers are validated server-side — no answer leakage to client.
     */
    async submitQuizAttempt(
        quizId: string,
        answers: { question_id: string; selected_option_id: string }[],
        startedAt: string
    ): Promise<QuizGradeResult> {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Not authenticated');

        const response = await supabase.functions.invoke('grade-quiz', {
            body: {
                quiz_id: quizId,
                answers,
                started_at: startedAt,
            },
        });

        if (response.error) {
            console.error('Error grading quiz:', response.error);
            throw new Error(response.error.message || 'Quiz grading failed');
        }

        return response.data as QuizGradeResult;
    },

    /**
     * Fetch the user's progress for a specific lesson.
     */
    async fetchProgress(lessonId: string, userId: string, tenantId: string): Promise<LessonProgress | null> {
        const { data, error } = await supabase
            .from('lesson_progress')
            .select('id, user_id, lesson_id, status, progress_percentage, last_position, completed, completed_at')
            .eq('lesson_id', lessonId)
            .eq('user_id', userId)
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching progress:', error);
            return null;
        }

        return data as LessonProgress | null;
    },

    /**
     * Seeds a dummy video resource for development and testing purposes.
     * MUST NOT be exposed in production.
     */
    async seedDummyVideo(lessonId: string, tenantId: string, videoUrl: string): Promise<void> {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Note: the `lesson_resources` requires knowing how videos are stored.
        // We assume `type: 'VIDEO'`, and `url: videoUrl`.
        const { error } = await supabase.from('lesson_resources').insert({
            lesson_id: lessonId,
            tenant_id: tenantId,
            type: 'VIDEO',
            url: videoUrl,
            title: 'Dummy Video (Seeded from UI)',
            content: '',
            metadata: {}
        });

        if (error) {
            console.error('Error seeding dummy video:', error);
            throw new Error(error.message || 'Failed to seed dummy video');
        }
    }
};
