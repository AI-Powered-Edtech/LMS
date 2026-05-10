export type XAPIVerb =
  | "experienced"
  | "completed"
  | "attempted"
  | "scored"
  | "passed"
  | "failed"
  | "launched"
  | "submitted";

export type XAPIObjectType =
  | "lesson"
  | "quiz"
  | "assignment"
  | "course"
  | "block";

export interface XAPIResult {
  score?: number;
  success?: boolean;
  completion?: boolean;
  duration?: number;
}

export interface XAPIContext {
  course_id?: string;
  module_id?: string;
  lesson_id?: string;
  tenant_id?: string;
  platform?: string;
}

export interface XAPIStatement {
  id: string;
  actor_id: string;
  verb: XAPIVerb;
  object_type: XAPIObjectType;
  object_id: string;
  result: XAPIResult;
  context: XAPIContext;
  timestamp: string;
  stored: string;
  tenant_id: string;
}
