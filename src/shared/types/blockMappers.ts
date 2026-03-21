import { DomainBlock } from './blockTypes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapBlock(row: any): DomainBlock {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    type: row.type,
    url: row.url,
    title: row.title,
    content: row.content,
    metadata: row.metadata,
    orderIndex: row.order_index,
    tenantId: row.tenant_id,
  }
}
