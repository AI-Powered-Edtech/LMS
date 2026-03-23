import {
  ArticleViewer,
  AssignmentViewer,
  QuizViewer,
  VideoViewer,
} from '@/src/components/LessonViewer'
import { ReviewPrompt } from '@/src/features/recommendations'

import type { Lesson } from '../../index'

interface LegacyContentFallbackProps {
  lesson: Lesson
  status: string
  lastPosition: number
  progressPercentage: number
  lastQuizScore: number | null
  lessonId: string | null
  userId?: string
  onProgressUpdate: (percentage: number, position?: number) => void
  onCompletionMet: () => void
  onStartViewing: () => void
}

export function LegacyContentFallback({
  lesson,
  status,
  lastPosition,
  lastQuizScore,
  lessonId,
  userId: _userId,
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
}: LegacyContentFallbackProps) {
  const isCompleted = status === 'completed'

  // Video Lesson
  if (lesson.type === 'video') {
    const videoResource = lesson.lesson_resources?.find((r) => r.type === 'VIDEO')
    const videoUrl = videoResource?.url || videoResource?.content || ''

    return (
      <VideoViewer
        videoUrl={videoUrl}
        savedPosition={lastPosition}
        isCompleted={isCompleted}
        onProgressUpdate={onProgressUpdate}
        onCompletionMet={onCompletionMet}
        onStartViewing={onStartViewing}
      />
    )
  }

  // Article Lesson
  if (lesson.type === 'article') {
    const articleResource = lesson.lesson_resources?.find(
      (r) => r.type === 'DOCUMENT' || r.type === 'LINK'
    )
    const content = articleResource?.content || lesson.content || 'Konten belum tersedia.'
    const minReadTime = (lesson.duration_minutes || 2) * 60

    return (
      <ArticleViewer
        content={content}
        minReadingTimeSeconds={minReadTime}
        isCompleted={isCompleted}
        onProgressUpdate={onProgressUpdate}
        onCompletionMet={onCompletionMet}
        onStartViewing={onStartViewing}
      />
    )
  }

  // Quiz Lesson
  if (lesson.type === 'quiz') {
    const quiz = lesson.quizzes?.[0]
    if (!quiz) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
          Kuis belum tersedia untuk pelajaran ini.
        </div>
      )
    }

    return (
      <div>
        <QuizViewer
          quizId={quiz.id}
          title={quiz.title}
          instructions={quiz.instructions}
          questions={quiz.quiz_questions}
          maxAttempts={quiz.max_attempts}
          passingScore={quiz.passing_score ?? 0}
          isCompleted={isCompleted}
          onCompletionMet={onCompletionMet}
          onStartViewing={onStartViewing}
        />
        {isCompleted && lastQuizScore !== null && (
          <div className="px-8 pb-4">
            <ReviewPrompt score={lastQuizScore} lessonId={lessonId ?? ''} quizId={quiz.id} />
          </div>
        )}
      </div>
    )
  }

  // Assignment Lesson
  if (lesson.type === 'assignment') {
    const assignment = lesson.assignments?.[0]
    if (!assignment) {
      return (
        <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
          Tugas belum tersedia untuk pelajaran ini.
        </div>
      )
    }

    return (
      <AssignmentViewer
        assignmentId={assignment.id}
        title={assignment.title}
        instructions={assignment.instructions}
        maxPoints={assignment.max_points}
        maxAttempts={assignment.max_attempts}
        isPublished={assignment.is_published}
        dueDate={assignment.due_date}
        isCompleted={isCompleted}
        onCompletionMet={onCompletionMet}
        onStartViewing={onStartViewing}
      />
    )
  }

  return null
}
