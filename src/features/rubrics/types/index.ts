export interface RubricLevel {
  id: string;
  label: string;
  description: string;
  points: number;
  order: number;
}

export interface RubricCriterion {
  id: string;
  rubric_id?: string;
  title: string;
  description: string;
  max_points: number;
  order: number;
  levels: RubricLevel[];
}

export interface Rubric {
  id: string;
  assignment_id: string | null;
  title: string;
  description: string;
  is_template: boolean;
  total_points: number;
  tenant_id: string;
  created_by: string;
  created_at: string;
  criteria: RubricCriterion[];
}

export type RubricInsert = Omit<
  Rubric,
  "id" | "tenant_id" | "created_at" | "total_points"
>;

export interface RubricScore {
  criterion_id: string;
  level_id: string | null;
  score: number;
  comment: string;
}

export interface RubricTemplateSummary {
  id: string;
  title: string;
  description: string | null;
  total_points: number;
  created_at: string;
}
