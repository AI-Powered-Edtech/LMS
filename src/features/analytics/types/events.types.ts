/** Locked event types -- do NOT add new types without architect approval */
export type LearningEventType =
  | "LESSON_STARTED"
  | "LESSON_COMPLETED"
  | "BLOCK_VIEWED"
  | "VIDEO_PROGRESS"
  | "QUIZ_STARTED"
  | "QUIZ_SUBMITTED"
  | "ASSIGNMENT_SUBMITTED"
  | "FILE_DOWNLOADED";

/** Metadata schemas per event type */
export interface BlockViewedMeta {
  block_id: string;
  block_type: string;
  time_spent: number; // seconds
}

export interface VideoProgressMeta {
  block_id: string;
  position: number; // seconds
  duration: number; // total seconds
  percent: number;
}

export interface QuizSubmittedMeta {
  quiz_id: string;
  score: number;
  max_score: number;
  attempt: number;
}

export interface LessonStartedMeta {
  resume: boolean; // true if resuming from saved position
}

export interface LessonCompletedMeta {
  time_spent: number; // total seconds in session
  blocks_viewed: number;
}

export interface QuizStartedMeta {
  quiz_id: string;
  attempt: number;
}

export interface AssignmentSubmittedMeta {
  assignment_id: string;
}

export interface FileDownloadedMeta {
  block_id: string;
  file_name: string;
}

export type EventMetadata =
  | BlockViewedMeta
  | VideoProgressMeta
  | QuizSubmittedMeta
  | LessonStartedMeta
  | LessonCompletedMeta
  | QuizStartedMeta
  | AssignmentSubmittedMeta
  | FileDownloadedMeta
  | Record<string, unknown>;

export interface LearningEvent {
  event_id: string; // client-generated UUID for dedup
  event_type: LearningEventType;
  course_id?: string;
  lesson_id?: string;
  module_id?: string;
  session_id: string;
  client_timestamp: string; // ISO string
  metadata: EventMetadata;
}
