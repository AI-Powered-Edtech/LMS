import { supabase } from '../lib/supabase';

export type GradeStatus = 'ungraded' | 'graded' | 'needs_revision';

export interface GradebookAssignment {
    id: string;
    title: string;
    type: 'quiz' | 'assignment' | 'project' | 'exam' | 'presentation' | 'offline';
    maxScore: number;
    date: string;
}

export interface GradeEntry {
    score: number | null;
    status: GradeStatus;
    feedback?: string;
}

export type GradeData = Record<string, Record<string, GradeEntry>>;

export interface GradebookStudent {
    id: string;
    name: string;
    nis: string;
    avatarSeed?: string;
}

export interface GradebookData {
    assignments: GradebookAssignment[];
    students: GradebookStudent[];
    grades: GradeData;
}

export const gradebookService = {
    /**
     * Fetch complete gradebook data: assignments, students, and grade entries.
     */
    async fetchGradebook(): Promise<GradebookData> {
        // Fetch assignments
        const { data: assignmentsData } = await supabase
            .from('assignments')
            .select('id, title, due_date, created_at')
            .order('created_at', { ascending: false });

        const assignments: GradebookAssignment[] = (assignmentsData ?? []).map(a => ({
            id: a.id,
            title: a.title,
            type: 'assignment' as const,
            maxScore: 100,
            date: a.due_date
                ? new Date(a.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                : '',
        }));

        // Fetch submissions with grades
        const { data: submissionsData } = await supabase
            .from('assignment_submissions')
            .select('id, assignment_id, student_id, status, grades(score, feedback)')
            .order('submitted_at', { ascending: false });

        // Fetch student profiles
        const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .eq('is_active', true);

        const students: GradebookStudent[] = (profilesData ?? []).map(p => ({
            id: p.id,
            name: `${p.first_name} ${p.last_name}`.trim() || p.email,
            nis: p.email.split('@')[0],
        }));

        // Build grade map from submissions
        const grades: GradeData = {};
        if (submissionsData) {
            submissionsData.forEach(sub => {
                if (!grades[sub.student_id]) grades[sub.student_id] = {};
                const grade = (sub as any).grades;
                grades[sub.student_id][sub.assignment_id] = {
                    score: grade?.score ?? null,
                    status: grade ? 'graded' : 'ungraded',
                    feedback: grade?.feedback,
                };
            });
        }

        return { assignments, students, grades };
    },

    /**
     * Submit a grade via edge function (secure, server-side grading).
     */
    async submitGrade(submissionId: string, score: number, feedback?: string): Promise<void> {
        const { error } = await supabase.functions.invoke('grade-submission', {
            body: { submission_id: submissionId, score, feedback },
        });
        if (error) throw error;
    },
};
