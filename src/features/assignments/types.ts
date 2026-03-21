export interface Attachment {
  id: string
  name: string
  type: string
  url: string
}

export interface Comment {
  id: string
  author: string
  text: string
  time: string
}

export interface StudentSubmission {
  id: string | number
  studentName: string
  status: 'assigned' | 'submitted' | 'graded' | 'late'
  submittedAt: string | null
  grade: number | null
  uploadedFiles: Attachment[]
}

export interface AssignmentUiState {
  id: string
  title: string
  description: string
  dueDate: string
  maxGrade: number
  type: 'individual' | 'group'
  status: 'assigned' | 'submitted' | 'graded' | 'late'
  grade: number | null
  submittedAt: string | null
  attachments: Attachment[]
  comments: Comment[]
  studentSubmissions: StudentSubmission[]
}
