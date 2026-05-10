export interface DomainCourse {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "in_review" | "approved" | "published" | "archived";
  tenantId: string;
  publishedAt: string | null;
  updatedAt: string | null;
}
