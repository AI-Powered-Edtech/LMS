export interface DomainBlock {
  id: string;
  lessonId: string;
  type: string; // BlockType from blockRegistry
  url: string | null;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
  orderIndex: number;
  tenantId: string;
}
