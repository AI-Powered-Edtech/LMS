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
  id: string;
  studentId: string;
  studentName: string;
  status: "assigned" | "submitted" | "graded" | "late";
  submittedAt: string | null;
  grade: number | null;
  rawScore: number | null;
  attemptNumber: number;
  uploadedFiles: Attachment[];
  linkUrl: string | null;
  isLate: boolean;
}

export interface AssignmentAttemptUi {
  id: string;
  attemptNumber: number;
  status: "draft" | "submitted" | "late" | "graded" | "returned";
  submittedAt: string | null;
  text: string;
  fileUrl: string | null;
  fileName: string | null;
  linkUrl: string | null;
  rawScore: number | null;
  grade: number | null;
  feedback: string | null;
  isLate: boolean;
  latePenaltyPercent: number;
}

export interface AssignmentUiState {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  availableFrom: string | null;
  maxGrade: number;
  maxAttempts: number;
  remainingAttempts: number;
  type: "individual" | "group";
  status: "assigned" | "submitted" | "graded" | "late";
  grade: number | null;
  rawScore: number | null;
  submittedAt: string | null;
  allowTextSubmission: boolean;
  allowFileSubmission: boolean;
  allowLinkSubmission: boolean;
  reminderEnabled: boolean;
  latePenaltyPercent: number;
  canResubmit: boolean;
  attachments: Attachment[];
  comments: Comment[];
  attempts: AssignmentAttemptUi[];
  studentSubmissions: StudentSubmission[];
}
