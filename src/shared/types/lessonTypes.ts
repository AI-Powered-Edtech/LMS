export interface DomainLesson {
  id: string;
  moduleId: string;
  title: string;
  type: string;
  orderIndex: number;
  isPublished: boolean;
  durationMinutes: number | null;
  passingScore: number | null;
  tenantId: string;
  is_remedial?: boolean;
}
