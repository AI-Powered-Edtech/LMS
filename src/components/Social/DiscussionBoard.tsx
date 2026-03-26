import React from 'react'
import { CommentSection } from './CommentSection'

interface DiscussionBoardProps {
  courseId: string
  lessonId?: string
  isTeacher?: boolean
}

export const DiscussionBoard: React.FC<DiscussionBoardProps> = ({ courseId, lessonId }) => {
  return (
    <CommentSection entityId={lessonId || courseId} entityType={lessonId ? 'lesson' : 'course'} />
  )
}
