import { DomainBlock } from './blockTypes'
import { BlockRowSchema } from '../schemas'
import { validate } from '../lib/validate'

export function mapBlock(row: unknown): DomainBlock {
  const r = validate(BlockRowSchema, row, 'BlockRow')
  return {
    id: r.id,
    lessonId: r.lesson_id,
    type: r.type,
    url: r.url,
    title: r.title,
    content: r.content,
    metadata: r.metadata,
    orderIndex: r.order_index,
    tenantId: r.tenant_id,
  }
}
