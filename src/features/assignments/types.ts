export interface Attachment {
    id: string;
    name: string;
    type: string;
    url: string;
}

export interface Comment {
    id: string;
    author: string;
    text: string;
    time: string;
}

export interface StudentSubmission {
    id: string | number;
    studentName: string;
    status: 'assigned' | 'submitted' | 'graded' | 'late';
    submittedAt: string | null;
    grade: number | null;
    uploadedFiles: Attachment[];
}

export interface AssignmentListDto {
    id: string;
    title: string;
    instructions: string | null;
    due_date: string | null;
    max_points: number;
    type?: 'individual' | 'group'; // Based on prior UI
    assignment_submissions: {
        id: string;
        status: string;
        score: number | null;
        submitted_at: string | null;
    }[];
}

export interface AssignmentUiState {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    maxGrade: number;
    type: "individual" | "group";
    status: "assigned" | "submitted" | "graded" | "late";
    grade: number | null;
    submittedAt: string | null;
    attachments: Attachment[];
    comments: Comment[];
    studentSubmissions: StudentSubmission[];
}
