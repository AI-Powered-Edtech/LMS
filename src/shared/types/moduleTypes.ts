import { DomainLesson } from './lessonTypes'

export interface DomainModule {
  id: string
  courseId: string
  title: string
  orderIndex: number
  tenantId: string
  lessons: DomainLesson[]
}
