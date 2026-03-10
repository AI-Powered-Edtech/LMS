import { DomainModule } from './types';
import { mapLesson } from '../lesson/mappers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapModule(row: any): DomainModule {
    return {
        id: row.id,
        courseId: row.course_id,
        title: row.title,
        orderIndex: row.order, // mapped from db 'order' to 'orderIndex'
        tenantId: row.tenant_id,
        lessons: row.lessons ? row.lessons.map(mapLesson) : [],
    };
}
