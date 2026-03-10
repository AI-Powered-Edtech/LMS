import { supabase } from '../lib/supabase';

// --- Types ---

export interface AttemptDetailAnswer {
    question_id: string;
    question_text: string;
    question_position: number;
    selected_option_id: string | null;
    selected_option_text: string | null;
    correct_option_id: string | null;
    correct_option_text: string | null;
    is_correct: boolean;
}

export interface QuestionDifficulty {
    question_id: string;
    question_text: string;
    question_position: number;
    correct_count: number;
    total_attempts: number;
    difficulty_percent: number;
}

// --- Service ---

export const quizAnalyticsService = {
    /**
     * Fetch detailed answers for a specific quiz attempt.
     * Shows student's selected option vs correct option per question.
     */
    async getAttemptDetail(attemptId: string): Promise<AttemptDetailAnswer[]> {
        const { data, error } = await supabase.rpc('get_attempt_detail', {
            p_attempt_id: attemptId,
        });

        if (error) {
            console.error('Error fetching attempt detail:', error);
            throw error;
        }

        return (data ?? []) as AttemptDetailAnswer[];
    },

    /**
     * Fetch question difficulty statistics for a quiz.
     * Returns percentage of students who answered each question correctly.
     */
    async getQuestionDifficulty(quizId: string): Promise<QuestionDifficulty[]> {
        const { data, error } = await supabase.rpc('get_question_difficulty', {
            p_quiz_id: quizId,
        });

        if (error) {
            console.error('Error fetching question difficulty:', error);
            throw error;
        }

        return (data ?? []) as QuestionDifficulty[];
    },

    /**
     * Generate CSV string from gradebook attempt data.
     * Pure frontend export — no server-side processing needed.
     */
    exportGradebookCSV(attempts: {
        profiles?: { full_name: string } | null;
        quizzes?: { title: string } | null;
        score: number | null;
        passed: boolean | null;
        time_spent: number | null;
        submitted_at: string | null;
    }[]): string {
        const headers = ['Nama Siswa', 'Judul Kuis', 'Skor', 'Status', 'Waktu (detik)', 'Tanggal Submit'];
        const rows = attempts.map(a => [
            a.profiles?.full_name || 'Siswa',
            a.quizzes?.title || '-',
            a.score?.toString() ?? '-',
            a.passed === true ? 'Lulus' : a.passed === false ? 'Tidak Lulus' : '-',
            a.time_spent?.toString() ?? '-',
            a.submitted_at
                ? new Date(a.submitted_at).toLocaleString('id-ID', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                })
                : '-',
        ]);

        const csvContent = [headers, ...rows]
            .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
            .join('\n');

        return csvContent;
    },

    /**
     * Trigger CSV file download in the browser.
     */
    downloadCSV(csvContent: string, filename: string): void {
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },
};
