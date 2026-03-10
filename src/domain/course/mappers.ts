import { DomainCourse } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapCourse(row: any): DomainCourse {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        tenantId: row.tenant_id,
        publishedAt: row.published_at,
        updatedAt: row.updated_at,
    };
}
