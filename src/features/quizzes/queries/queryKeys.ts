// Quiz Query Keys
// Part of the Quiz Engine Refactor

export const QuizKeys = {
  // Student queries
  studentAssignments: (tenantId: string | undefined) => 
    tenantId ? ['quiz', 'studentAssignments', tenantId] : ['quiz', 'studentAssignments'],
  
  userAttempts: (tenantId: string | undefined) => 
    tenantId ? ['quiz', 'userAttempts', tenantId] : ['quiz', 'userAttempts'],
  
  attemptQuestions: (attemptId: string | null, tenantId: string | undefined) => 
    attemptId && tenantId ? ['quiz', 'attemptQuestions', attemptId, tenantId] : ['quiz', 'attemptQuestions'],
  
  activeAttempt: (quizId: string | null, tenantId: string | undefined, assignmentId?: string | null) => 
    ['quiz', 'activeAttempt', quizId, tenantId, assignmentId],

  // Teacher queries
  teacherQuizzes: (tenantId: string | undefined) => 
    tenantId ? ['quiz', 'teacherQuizzes', tenantId] : ['quiz', 'teacherQuizzes'],
  
  quizzesByClass: (classId: string, tenantId: string | undefined) => 
    tenantId ? ['quiz', 'quizzesByClass', classId, tenantId] : ['quiz', 'quizzesByClass', classId],
  
  quizWithQuestions: (quizId: string, tenantId: string | undefined) => 
    tenantId ? ['quiz', 'quizWithQuestions', quizId, tenantId] : ['quiz', 'quizWithQuestions', quizId],
  
  assignmentsByQuiz: (quizId: string, tenantId: string | undefined) => 
    tenantId ? ['quiz', 'assignmentsByQuiz', quizId, tenantId] : ['quiz', 'assignmentsByQuiz', quizId],
  
  assignmentsByClass: (classId: string, tenantId: string | undefined) => 
    tenantId ? ['quiz', 'assignmentsByClass', classId, tenantId] : ['quiz', 'assignmentsByClass', classId],
  
  assignmentResults: (assignmentId: string, tenantId: string | undefined) => 
    tenantId ? ['quiz', 'assignmentResults', assignmentId, tenantId] : ['quiz', 'assignmentResults', assignmentId],
} as const;
