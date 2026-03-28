import { ScormPlayer } from '@/src/features/lessons/components/ScormPlayer'
import type { LessonResource } from '@/src/features/lessons/types'
import type { Assignment, Quiz } from '@/src/features/lessons/types'
import { QuizViewer } from '@/src/features/quizzes/components/QuizViewer'

import { AssignmentViewer } from './AssignmentViewer'
import { FileBlockViewer } from './blocks/FileBlockViewer'
import { ImageBlockViewer } from './blocks/ImageBlockViewer'
import { MarkdownBlock } from './blocks/MarkdownBlock'
import { VideoBlock } from './blocks/VideoBlock'

interface BlockRendererProps {
  block: LessonResource
  /** Matched quiz (if block.type === 'quiz') */
  quiz?: Quiz
  /** Matched assignment (if block.type === 'assignment') */
  assignment?: Assignment
  isCompleted: boolean
  savedVideoPosition?: number | null
  onVideoTimeUpdate?: (seconds: number) => void
  onCompletionMet?: () => void
  onProgressUpdate?: (pct: number) => void
  onStartViewing?: () => void
}

export function BlockRenderer({
  block,
  quiz,
  assignment,
  isCompleted,
  savedVideoPosition,
  onVideoTimeUpdate,
  onCompletionMet,
  onProgressUpdate,
  onStartViewing,
}: BlockRendererProps) {
  const type = block.type?.toLowerCase()
  switch (type) {
    case 'text':
      return (
        <div className="px-6 py-4">
          <MarkdownBlock content={block.content || ''} />
        </div>
      )

    case 'video':
      return (
        <VideoBlock
          blockId={block.id}
          url={block.url || ''}
          metadata={block.metadata}
          isCompleted={isCompleted}
          savedVideoPosition={savedVideoPosition}
          onProgressUpdate={onProgressUpdate ?? (() => {})}
          onCompletionMet={onCompletionMet ?? (() => {})}
          onStartViewing={onStartViewing ?? (() => {})}
          onVideoTimeUpdate={onVideoTimeUpdate}
        />
      )

    case 'image':
      if (!block.url)
        return <div className="px-6 py-4 text-sm text-slate-500 italic">Gambar tidak tersedia.</div>
      return (
        <div className="px-6 py-4">
          <ImageBlockViewer url={block.url} alt={block.title || ''} />
        </div>
      )

    case 'file':
      return (
        <div className="px-6 py-4">
          <FileBlockViewer url={block.url || ''} title={block.title} />
        </div>
      )

    case 'quiz':
      if (!quiz)
        return <div className="px-6 py-4 text-slate-500 text-sm">Kuis tidak ditemukan.</div>
      return (
        <QuizViewer
          quizId={quiz.id}
          title={quiz.title}
          instructions={quiz.instructions}
          questions={quiz.quiz_questions}
          maxAttempts={quiz.max_attempts}
          passingScore={quiz.passing_score ?? 0}
          isCompleted={isCompleted}
          onCompletionMet={onCompletionMet ?? (() => {})}
          onStartViewing={onStartViewing ?? (() => {})}
        />
      )

    case 'assignment':
      if (!assignment)
        return <div className="px-6 py-4 text-slate-500 text-sm">Tugas tidak ditemukan.</div>
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
          onCompletionMet={onCompletionMet ?? (() => {})}
          onStartViewing={onStartViewing ?? (() => {})}
        />
      )

    case 'scorm': {
      const scormPackageId = block.metadata?.scorm_package_id as string | undefined
      if (!scormPackageId)
        return <div className="px-6 py-4 text-slate-500 text-sm">Paket SCORM tidak ditemukan.</div>
      return (
        <ScormPlayer
          scormPackageId={scormPackageId}
          lessonId={block.lesson_id}
          onCompletionMet={onCompletionMet ?? (() => {})}
        />
      )
    }

    default:
      if (import.meta.env.DEV) {
        return (
          <div className="px-6 py-4 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg m-4">
            Tipe blok tidak dikenal: <strong>{block.type}</strong>
          </div>
        )
      }
      return null
  }
}
