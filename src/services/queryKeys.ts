export const QueryKeys = {
  // Global / Core
  session: ['session'],
  tenant: (tenantId: string) => ['tenant', tenantId],

  // Courses
  courses: (tenantId: string) => ['courses', tenantId],
  teacherCourses: (teacherId: string) => ['courses', 'teacher', teacherId],
  courseDetails: (courseId: string) => ['course', courseId],
  
  // Assignments
  assignments: (courseId: string) => ['assignments', courseId],
  assignmentDetails: (assignmentId: string) => ['assignment', assignmentId],
  submissions: (assignmentId: string) => ['submissions', assignmentId],
  
  // Quizzes
  quizzes: (courseId: string) => ['quizzes', courseId],
  quizDetails: (quizId: string) => ['quiz', quizId],
  quizAttempt: (attemptId: string) => ['quizAttempt', attemptId],
  
  // Analytics
  studentProgress: (studentId: string) => ['progress', studentId],
  classAnalytics: (classId: string) => ['analytics', classId],
};
