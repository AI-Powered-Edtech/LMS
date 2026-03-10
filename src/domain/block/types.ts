export interface DomainBlock {
    id: string;
    lessonId: string;
    type: string;       // text, video, image, file, quiz
    url: string | null;
    title: string | null;
    content: string | null;
    metadata: Record<string, unknown>;
    orderIndex: number;
    tenantId: string;
}
