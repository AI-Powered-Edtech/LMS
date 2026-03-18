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

export interface SignedProgressQueue {
    payload: string;
    signature: string;
    createdAt: number;
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
