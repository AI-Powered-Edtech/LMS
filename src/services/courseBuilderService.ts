import { supabase } from '../lib/supabase';

// ============================================================
// Types
// ============================================================

export interface BuilderModule {
    id: string;
    course_id: string;
    title: string;
    description: string | null;
    order_index: number;
    tenant_id: string;
    lessons: BuilderLesson[];
}

export interface BuilderLesson {
    id: string;
    module_id: string;
    title: string;
    type: string;
    order: number;
    is_published: boolean;
    duration_minutes: number | null;
    passing_score: number | null;
    tenant_id: string;
}

export interface LessonBlock {
    id: string;
    lesson_id: string;
    type: string;       // text, video, image, file, quiz
    url: string | null;
    title: string | null;
    content: string | null;
    metadata: Record<string, unknown>;
    order_index: number;
    tenant_id: string;
}

export interface AssignmentBlockData {
    id?: string;
    title: string;
    instructions: string | null;
    max_points: number;
    max_attempts: number;
    is_published: boolean;
    due_date?: string | null;
}

export interface QuizBlockData {
    id?: string;
    title: string;
    instructions: string | null;
    max_attempts: number;
    passing_score?: number;
    shuffle_questions?: boolean;
    shuffle_options?: boolean;
    time_limit_minutes?: number;
    status?: 'draft' | 'published' | 'archived';
    mode?: 'practice' | 'graded' | 'exam';
    show_correct_answers?: boolean;
    available_from?: string | null;
    available_until?: string | null;
    questions: {
        id?: string;
        text: string;
        order: number;
        question_type?: 'MCQ' | 'TRUE_FALSE' | 'MULTIPLE_SELECT' | 'SHORT_ANSWER' | 'ESSAY';
        points?: number;
        explanation?: string | null;
        options: {
            id?: string;
            text: string;
            is_correct: boolean;
        }[];
    }[];
}

// ============================================================
// Service
// ============================================================

export const courseBuilderService = {

    // ─── Staged Loading ─────────────────────────────────────

    /** Stage 1: Fetch modules + lessons (no blocks / quiz detail) */
    async fetchCourseStructure(courseId: string): Promise<{
        course: { id: string; title: string; description: string | null };
        modules: BuilderModule[];
    }> {
        const { data: course, error: courseErr } = await supabase
            .from('courses')
            .select('id, title, description')
            .eq('id', courseId)
            .single();

        if (courseErr || !course) throw new Error('Course not found');

        const { data: modules, error: modErr } = await supabase
            .from('course_modules')
            .select(`
        id, course_id, title, "order", tenant_id,
        lessons (
          id, module_id, title, type, "order", is_published,
          duration_minutes, passing_score, tenant_id
        )
      `)
            .eq('course_id', courseId)
            .order('order', { ascending: true });

        if (modErr) throw new Error(modErr.message);

        // Sort lessons within each module
        const sorted = (modules || []).map(m => ({
            ...m,
            description: null,
            order_index: (m as any).order,
            lessons: ((m as any).lessons || []).sort(
                (a: BuilderLesson, b: BuilderLesson) => a.order - b.order
            ),
        })) as unknown as BuilderModule[];

        return { course, modules: sorted };
    },

    /** Stage 2: Fetch blocks for a specific lesson (on click) */
    async fetchLessonBlocks(lessonId: string): Promise<LessonBlock[]> {
        const { data, error } = await supabase
            .from('lesson_resources')
            .select('id, lesson_id, type, url, title, content, metadata, order_index, tenant_id')
            .eq('lesson_id', lessonId)
            .order('order_index', { ascending: true });

        if (error) throw new Error(error.message);
        return (data || []) as LessonBlock[];
    },

    // ─── Module CRUD ────────────────────────────────────────

    async createModule(courseId: string, title: string, tenantId: string): Promise<BuilderModule> {
        // Get next order_index
        const { count } = await supabase
            .from('course_modules')
            .select('id', { count: 'exact', head: true })
            .eq('course_id', courseId);

        const { data, error } = await supabase
            .from('course_modules')
            .insert({
                course_id: courseId,
                title,
                "order": count || 0,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return {
            ...data,
            description: null,
            order_index: data.order,
            lessons: []
        } as unknown as BuilderModule;
    },

    async updateModule(moduleId: string, data: { title?: string; description?: string }): Promise<void> {
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;

        const { error } = await supabase
            .from('course_modules')
            .update(updateData)
            .eq('id', moduleId);
        if (error) throw new Error(error.message);
    },

    async deleteModule(moduleId: string): Promise<void> {
        const { error } = await supabase
            .from('course_modules')
            .delete()
            .eq('id', moduleId);
        if (error) throw new Error(error.message);
    },

    async reorderModules(moduleIds: string[]): Promise<void> {
        // Bulk update order based on array position
        const updates = moduleIds.map((id, index) => ({
            id,
            "order": index,
            updated_at: new Date().toISOString()
        }));

        const { error } = await supabase
            .from('course_modules')
            .upsert(updates);
        if (error) throw new Error(error.message);
    },

    // ─── Lesson CRUD ────────────────────────────────────────

    async createLesson(
        moduleId: string, type: string, title: string, tenantId: string
    ): Promise<BuilderLesson> {
        const { count } = await supabase
            .from('lessons')
            .select('id', { count: 'exact', head: true })
            .eq('module_id', moduleId);

        const { data, error } = await supabase
            .from('lessons')
            .insert({
                module_id: moduleId,
                title,
                type,
                order: count || 0,
                is_published: false,
                tenant_id: tenantId,
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as BuilderLesson;
    },

    async updateLesson(
        lessonId: string,
        data: Partial<Pick<BuilderLesson, 'title' | 'type' | 'is_published' | 'duration_minutes' | 'passing_score'>>
    ): Promise<void> {
        const { error } = await supabase
            .from('lessons')
            .update(data)
            .eq('id', lessonId);
        if (error) throw new Error(error.message);
    },

    async deleteLesson(lessonId: string): Promise<void> {
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId);
        if (error) throw new Error(error.message);
    },

    async reorderLessons(lessonIds: string[]): Promise<void> {
        const updates = lessonIds.map((id, index) =>
            supabase.from('lessons').update({ order: index }).eq('id', id)
        );
        await Promise.all(updates);
    },

    // ─── Block CRUD ─────────────────────────────────────────

    async createBlock(
        lessonId: string, type: string, tenantId: string
    ): Promise<LessonBlock> {
        const { count } = await supabase
            .from('lesson_resources')
            .select('id', { count: 'exact', head: true })
            .eq('lesson_id', lessonId);

        const defaults: Record<string, { content?: string; url?: string }> = {
            text: { content: '' },
            video: { url: '' },
            image: { url: '' },
            file: { url: '' },
            quiz: {},
        };

        const { data, error } = await supabase
            .from('lesson_resources')
            .insert({
                lesson_id: lessonId,
                type: type.toUpperCase(),
                order_index: count || 0,
                tenant_id: tenantId,
                content: defaults[type]?.content ?? null,
                url: defaults[type]?.url ?? '',
                metadata: {},
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return data as LessonBlock;
    },

    async updateBlock(
        blockId: string,
        data: Partial<Pick<LessonBlock, 'content' | 'url' | 'title' | 'metadata'>>
    ): Promise<void> {
        const { error } = await supabase
            .from('lesson_resources')
            .update(data)
            .eq('id', blockId);
        if (error) throw new Error(error.message);
    },

    async deleteBlock(blockId: string): Promise<void> {
        const { error } = await supabase
            .from('lesson_resources')
            .delete()
            .eq('id', blockId);
        if (error) throw new Error(error.message);
    },

    async reorderBlocks(blockIds: string[]): Promise<void> {
        const updates = blockIds.map((id, index) =>
            supabase.from('lesson_resources').update({ order_index: index }).eq('id', id)
        );
        await Promise.all(updates);
    },

    // ─── Publish ────────────────────────────────────────────

    async publishLesson(lessonId: string, published: boolean): Promise<void> {
        await this.updateLesson(lessonId, { is_published: published });
    },

    // ─── Quiz ────────────────────────────────────────────────

    async getQuizByLesson(lessonId: string, tenantId?: string) {
        let query = supabase
            .from('quizzes')
            .select(`
                *,
                quiz_questions (
                    id, text, "order", question_type, points, explanation,
                    quiz_options (id, text, is_correct)
                )
            `)
            .eq('lesson_id', lessonId);

        if (tenantId) query = query.eq('tenant_id', tenantId);

        const { data, error } = await query.single();

        if (error && error.code !== 'PGRST116') throw new Error(error.message);
        return data || null;
    },

    async saveQuizData(lessonId: string, tenantId: string, data: QuizBlockData): Promise<{ quiz_id: string }> {
        // Uses atomic RPC save_quiz_builder — all operations run in a single DB transaction
        const { data: result, error } = await supabase.rpc('save_quiz_builder', {
            p_lesson_id: lessonId,
            p_tenant_id: tenantId,
            p_quiz_data: data,
        });
        if (error) throw new Error(error.message);
        return result as { quiz_id: string };
    },

    async publishQuiz(quizId: string): Promise<void> {
        const { error } = await supabase
            .from('quizzes')
            .update({ status: 'published' })
            .eq('id', quizId);
        if (error) throw new Error(error.message);
    },

    async draftQuiz(quizId: string): Promise<void> {
        const { error } = await supabase
            .from('quizzes')
            .update({ status: 'draft' })
            .eq('id', quizId);
        if (error) throw new Error(error.message);
    },

    // ─── Assignment ──────────────────────────────────────────

    async getAssignmentByLesson(lessonId: string, tenantId?: string) {
        let query = supabase
            .from('assignments')
            .select('*')
            .eq('lesson_id', lessonId);

        if (tenantId) query = query.eq('tenant_id', tenantId);

        const { data, error } = await query.maybeSingle();

        if (error) throw new Error(error.message);
        return data || null;
    },

    async saveAssignmentData(lessonId: string, courseId: string, tenantId: string, data: AssignmentBlockData) {
        if (data.id) {
            const { data: result, error } = await supabase
                .from('assignments')
                .update({
                    title: data.title,
                    instructions: data.instructions,
                    max_points: data.max_points,
                    max_attempts: data.max_attempts,
                    is_published: data.is_published,
                    due_date: data.due_date
                })
                .eq('id', data.id)
                .select()
                .single();
            if (error) throw new Error(error.message);
            return result;
        } else {
            const { data: result, error } = await supabase
                .from('assignments')
                .insert({
                    lesson_id: lessonId,
                    course_id: courseId,
                    tenant_id: tenantId,
                    title: data.title,
                    instructions: data.instructions,
                    max_points: data.max_points,
                    max_attempts: data.max_attempts,
                    is_published: data.is_published,
                    due_date: data.due_date
                })
                .select()
                .single();
            if (error) throw new Error(error.message);
            return result;
        }
    }
};
