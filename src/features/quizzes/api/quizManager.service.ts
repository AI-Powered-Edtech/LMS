// ==========================================================================
// Quiz Manager Service — quizManager.service.ts
//
// Teacher-facing API. Re-exports from quizCRUD.ts and
// quizQuestionManagement.ts for backward compatibility.
// ==========================================================================

// Quiz CRUD operations
export {
  createQuiz,
  deleteQuiz,
  getQuizWithQuestions,
  getQuizzesByClass,
  getQuizzesByCourse,
  getTeacherQuizzes,
  setQuizStatus,
  updateQuiz,
} from "./quizCRUD";

// Question management and grading
export {
  addQuestionToQuiz,
  deleteQuizQuestion,
  getAssignmentResults,
  gradeAttemptQuestion,
  replaceQuestionOptions,
  updateQuizQuestion,
} from "./quizQuestionManagement";
