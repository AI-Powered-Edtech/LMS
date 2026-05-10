import { xapiService } from "../api/xapiService";

/**
 * Convenience builders for common EduSync xAPI statements.
 *
 * All methods are fire-and-forget — they return a Promise that resolves to
 * `string | null`. Call `.catch(() => {})` at the call site when you want to
 * be explicit about suppressing errors (though xapiService already swallows them).
 */
export const xapi = {
  /**
   * Emitted when a student successfully completes a lesson.
   * @param lessonId  - UUID of the completed lesson
   * @param courseId  - UUID of the parent course
   * @param moduleId  - UUID of the parent module
   * @param duration  - Time spent in seconds
   */
  lessonCompleted: (
    lessonId: string,
    courseId: string,
    moduleId: string,
    duration: number,
  ): Promise<string | null> =>
    xapiService.recordStatement(
      "completed",
      "lesson",
      lessonId,
      { completion: true, duration },
      { course_id: courseId, module_id: moduleId, platform: "edusync" },
    ),

  /**
   * Emitted when a student submits a quiz attempt (regardless of pass/fail).
   * @param quizId - UUID of the quiz
   * @param score  - Numeric score 0–100
   * @param passed - Whether the student passed the pass threshold
   */
  quizAttempted: (
    quizId: string,
    score: number,
    passed: boolean,
  ): Promise<string | null> =>
    xapiService.recordStatement(
      "attempted",
      "quiz",
      quizId,
      { score, success: passed, completion: true },
      { platform: "edusync" },
    ),

  /**
   * Emitted when a student achieves a passing score on a quiz.
   * @param quizId - UUID of the quiz
   * @param score  - Numeric score 0–100
   */
  quizPassed: (quizId: string, score: number): Promise<string | null> =>
    xapiService.recordStatement(
      "passed",
      "quiz",
      quizId,
      { score, success: true },
      { platform: "edusync" },
    ),

  /**
   * Emitted when a student submits an assignment.
   * @param assignmentId - UUID of the assignment
   */
  assignmentSubmitted: (assignmentId: string): Promise<string | null> =>
    xapiService.recordStatement(
      "submitted",
      "assignment",
      assignmentId,
      { completion: true },
      { platform: "edusync" },
    ),

  /**
   * Emitted when a student first views (experiences) a course.
   * @param courseId - UUID of the course
   */
  courseExperienced: (courseId: string): Promise<string | null> =>
    xapiService.recordStatement(
      "experienced",
      "course",
      courseId,
      {},
      { platform: "edusync" },
    ),
};
