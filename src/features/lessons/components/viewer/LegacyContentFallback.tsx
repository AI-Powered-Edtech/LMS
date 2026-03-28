import { Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { ArticleViewer, AssignmentViewer, VideoViewer } from '@/src/components/LessonViewer'
import { ReviewPrompt } from '@/src/features/recommendations'

import type { Lesson } from '../../index'

interface LegacyContentFallbackProps {
  lesson: Lesson
  status: string
  lastPosition: number
  lastQuizScore: number | null
  lessonId: string | null
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
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
}: LegacyContentFallbackProps) {
  const isCompleted = status === 'completed'
  const navigate = useNavigate()

  // Video Lesson
  if (lesson.type === 'video') {
    const videoResource = lesson.lesson_resources?.find((r) => r.type === 'VIDEO')
    const videoUrl = videoResource?.url || videoResource?.content || ''

    return (
      <VideoViewer
        videoUrl={videoUrl}
        metadata={videoResource?.metadata}
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
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-800/20 m-6 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mb-6">
          <Trophy className="w-8 h-8 text-blue-600 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 text-center">
          {quiz.title}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md text-center line-clamp-3">
          {quiz.instructions || 'Silakan kerjakan kuis ini melalui modul Kuis mandiri.'}
        </p>
        <button
          onClick={() => {
            onCompletionMet()
            navigate(`/app/student/quizzes?quizId=${quiz.id}`)
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
        >
          Menuju Halaman Kuis
        </button>
        {isCompleted && lastQuizScore !== null && (
          <div className="mt-8 w-full max-w-md">
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
