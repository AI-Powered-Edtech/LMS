import { lazy, Suspense } from 'react'

import { Skeleton } from '@/components/ui'
import { ScormPlayer } from '@/features/lessons/components/ScormPlayer'
import type { LessonResource } from '@/features/lessons/types'
import type { Assignment, Quiz } from '@/features/lessons/types'

import { AssignmentViewer } from './AssignmentViewer'
import { FileBlockViewer } from './blocks/FileBlockViewer'
import { ImageBlockViewer } from './blocks/ImageBlockViewer'
import { LessonQuizPlayer } from './blocks/LessonQuizPlayer'
import { MarkdownBlock } from './blocks/MarkdownBlock'
import { VideoBlock } from './blocks/VideoBlock'

// Lazy-loaded interactive block viewers (code-split for performance)
const FlashcardBlock = lazy(() =>
  import('@/features/interactive-blocks/components/FlashcardBlock').then((m) => ({
    default: m.FlashcardBlock,
  }))
)
const DragDropBlock = lazy(() =>
  import('@/features/interactive-blocks/components/DragDropBlock').then((m) => ({
    default: m.DragDropBlock,
  }))
)
const HotspotBlock = lazy(() =>
  import('@/features/interactive-blocks/components/HotspotBlock').then((m) => ({
    default: m.HotspotBlock,
  }))
)
const TimelineBlock = lazy(() =>
  import('@/features/interactive-blocks/components/TimelineBlock').then((m) => ({
    default: m.TimelineBlock,
  }))
)
const SortingBlock = lazy(() =>
  import('@/features/interactive-blocks/components/SortingBlock').then((m) => ({
    default: m.SortingBlock,
  }))
)
const FillBlankBlock = lazy(() =>
  import('@/features/interactive-blocks/components/FillBlankBlock').then((m) => ({
    default: m.FillBlankBlock,
  }))
)

interface VideoCaption {
  id: string
  file_url: string
  language: string
  label: string
  is_default: boolean
}

interface VideoCaption {
  id: string
  file_url: string
  language: string
  label: string
  is_default: boolean
}

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
  captions?: VideoCaption[]
}

const noop = () => {}

export function BlockRenderer({
  block,
  quiz,
  assignment,
  isCompleted,
  savedVideoPosition,
  onVideoTimeUpdate,
  onCompletionMet = noop,
  onProgressUpdate = noop,
  onStartViewing = noop,
  captions,
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
          onProgressUpdate={onProgressUpdate}
          onCompletionMet={onCompletionMet}
          onStartViewing={onStartViewing}
          onVideoTimeUpdate={onVideoTimeUpdate}
          captions={captions}
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
        <LessonQuizPlayer
          quizId={quiz.id}
          title={quiz.title}
          instructions={quiz.instructions}
          timeLimitMinutes={quiz.time_limit_minutes ?? undefined}
          maxAttempts={quiz.max_attempts ?? undefined}
          passingScore={quiz.passing_score ?? 0}
          isCompleted={isCompleted}
          onCompletionMet={onCompletionMet}
          onStartViewing={onStartViewing}
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
          onCompletionMet={onCompletionMet}
          onStartViewing={onStartViewing}
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
          onCompletionMet={onCompletionMet}
        />
      )
    }

    // ── Phase 32A: Interactive Block Types ─────────────────────────

    case 'flashcard': {
      let data
      try {
        data = JSON.parse(block.content || '{}')
      } catch {
        data = {}
      }
      return (
        <Suspense fallback={<Skeleton className="h-48 w-full mx-6 my-4" />}>
          <FlashcardBlock data={data} blockId={block.id} lessonId={block.lesson_id} />
        </Suspense>
      )
    }

    case 'drag_drop': {
      let data
      try {
        data = JSON.parse(block.content || '{}')
      } catch {
        data = {}
      }
      return (
        <Suspense fallback={<Skeleton className="h-48 w-full mx-6 my-4" />}>
          <DragDropBlock data={data} blockId={block.id} lessonId={block.lesson_id} />
        </Suspense>
      )
    }

    case 'hotspot': {
      let data
      try {
        data = JSON.parse(block.content || '{}')
      } catch {
        data = {}
      }
      return (
        <Suspense fallback={<Skeleton className="h-48 w-full mx-6 my-4" />}>
          <HotspotBlock data={data} blockId={block.id} lessonId={block.lesson_id} />
        </Suspense>
      )
    }

    case 'timeline': {
      let data
      try {
        data = JSON.parse(block.content || '{}')
      } catch {
        data = {}
      }
      return (
        <Suspense fallback={<Skeleton className="h-48 w-full mx-6 my-4" />}>
          <TimelineBlock data={data} blockId={block.id} lessonId={block.lesson_id} />
        </Suspense>
      )
    }

    case 'sorting': {
      let data
      try {
        data = JSON.parse(block.content || '{}')
      } catch {
        data = {}
      }
      return (
        <Suspense fallback={<Skeleton className="h-48 w-full mx-6 my-4" />}>
          <SortingBlock data={data} blockId={block.id} lessonId={block.lesson_id} />
        </Suspense>
      )
    }

    case 'fill_blank': {
      let data
      try {
        data = JSON.parse(block.content || '{}')
      } catch {
        data = {}
      }
      return (
        <Suspense fallback={<Skeleton className="h-48 w-full mx-6 my-4" />}>
          <FillBlankBlock data={data} blockId={block.id} lessonId={block.lesson_id} />
        </Suspense>
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
