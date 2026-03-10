import { supabase } from '../lib/supabase';

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
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface AssignmentSubmission {
    id: string;
    tenant_id: string;
    assignment_id: string;
    student_id: string;
    submission_text: string | null;
    file_url: string | null;
    score: number | null;
    feedback: string | null;
    status: 'draft' | 'submitted' | 'graded' | 'returned';
    attempt_number: number;
    submitted_at: string;
    graded_at: string | null;
    student_profile?: {
        full_name: string;
        avatar_url: string | null;
    };
}

export const assignmentService = {
    /**
     * Creates a new assignment linked to a lesson.
     */
    async createAssignment(assignment: Omit<Assignment, 'id' | 'created_at' | 'updated_at'>) {
        const { data, error } = await supabase
            .from('assignments')
            .insert(assignment)
            .select()
            .single();

        if (error) {
            console.error('Error creating assignment:', error);
            throw error;
        }

        return data as Assignment;
    },

    /**
     * Students submit their work.
     * Note: lesson_progress completion is handled by DB trigger.
     */
    async submitAssignment(submission: Omit<AssignmentSubmission, 'id' | 'submitted_at' | 'graded_at' | 'score' | 'feedback' | 'status'>) {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .upsert({
                ...submission,
                status: 'submitted',
                submitted_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error submitting assignment:', error);
            throw error;
        }

        return data as AssignmentSubmission;
    },

    /**
     * Teachers grade a submission.
     */
    async gradeSubmission(submissionId: string, score: number, feedback: string) {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .update({
                score,
                feedback,
                status: 'graded',
                graded_at: new Date().toISOString()
            })
            .eq('id', submissionId)
            .select()
            .single();

        if (error) {
            console.error('Error grading submission:', error);
            throw error;
        }

        return data as AssignmentSubmission;
    },

    /**
     * Fetches assignment details by lesson_id.
     */
    async getAssignmentByLesson(lessonId: string) {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .eq('lesson_id', lessonId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching assignment by lesson:', error);
            throw error;
        }

        return data as Assignment | null;
    },

    /**
     * Fetches assignment details along with student's current submission if any.
     */
    async getAssignmentDetails(assignmentId: string, studentId: string) {
        const { data, error } = await supabase
            .from('assignments')
            .select(`
                *,
                assignment_submissions!left (
                    *
                )
            `)
            .eq('id', assignmentId)
            .eq('assignment_submissions.student_id', studentId)
            .single();

        if (error) {
            console.error('Error fetching assignment details:', error);
            throw error;
        }

        return data;
    },

    /**
     * Fetches all submissions for an assignment (for Teacher Gradebook).
     */
    async getAssignmentSubmissions(assignmentId: string) {
        const { data, error } = await supabase
            .from('assignment_submissions')
            .select(`
                *,
                user_profiles:student_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('assignment_id', assignmentId)
            .order('submitted_at', { ascending: false });

        if (error) {
            console.error('Error fetching assignment submissions:', error);
            throw error;
        }

        return data as AssignmentSubmission[];
    }
};
