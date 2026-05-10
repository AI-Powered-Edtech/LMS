import { createQueryKeys } from "@/shared/lib/queryKeys";

const base = createQueryKeys("courses");

export const courseKeys = {
  ...base,

  // Enrollment check key
  enrollment: (tenantId: string, courseId: string, userId: string) =>
    [...base.all(tenantId), "enrollment", courseId, userId] as const,

  // Version history keys
  versions: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), "versions", courseId] as const,

  // Collaborator keys
  collaborators: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), "collaborators", courseId] as const,

  // Builder structure key (modules + lessons, no blocks)
  builder: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), "builder", courseId] as const,

  // Infinite list key (for CourseBrowser pagination).
  // Spreads search conditionally so undefined never appears as a key element.
  infinite: (tenantId: string, search?: string): readonly string[] => [
    ...base.all(tenantId),
    "infinite",
    ...(search ? [search] : []),
  ],

  // Activity feed for a course (course_action_logs)
  activity: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), "activity", courseId] as const,

  // Enrollment count (course_classes join table)
  enrollmentCount: (tenantId: string, courseId: string) =>
    [...base.all(tenantId), "enrollment-count", courseId] as const,
};
