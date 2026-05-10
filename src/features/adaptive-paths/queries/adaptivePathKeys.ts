import { createQueryKeys } from "@/shared/lib/queryKeys";

export const adaptivePathKeys = createQueryKeys("adaptive-paths");

export const adaptivePathQueryKeys = {
  ...adaptivePathKeys,
  byCourse: (tenantId: string, courseId: string) =>
    ["adaptive-paths", tenantId, "course", courseId] as const,
  evaluation: (
    tenantId: string,
    userId: string,
    courseId: string,
    lessonId: string,
  ) =>
    [
      "adaptive-paths",
      tenantId,
      "evaluation",
      userId,
      courseId,
      lessonId,
    ] as const,
};
