import type { LessonResource } from '@/src/features/lessons/types';
import type { Quiz, Assignment } from '@/src/features/lessons/types';
import { MarkdownBlock } from './blocks/MarkdownBlock';
import { VideoBlock } from './blocks/VideoBlock';
import { ImageBlockViewer } from './blocks/ImageBlockViewer';
import { FileBlockViewer } from './blocks/FileBlockViewer';
import { QuizViewer } from './QuizViewer';
import { AssignmentViewer } from './AssignmentViewer';

interface BlockRendererProps {
  block: LessonResource;
  /** Matched quiz (if block.type === 'quiz') */
  quiz?: Quiz;
  /** Matched assignment (if block.type === 'assignment') */
  assignment?: Assignment;
  isCompleted: boolean;
  onCompletionMet?: () => void;
  onProgressUpdate?: (pct: number) => void;
  onStartViewing?: () => void;
}

export function BlockRenderer({
  block,
  quiz,
  assignment,
  isCompleted,
  onCompletionMet,
  onProgressUpdate,
  onStartViewing,
}: BlockRendererProps) {
  const type = block.type?.toLowerCase();
  switch (type) {
    case 'text':
      return (
        <div className="px-6 py-4">
          <MarkdownBlock content={block.content || ''} />
        </div>
      );

    case 'video':
      return (
        <VideoBlock
          url={block.url || ''}
          isCompleted={isCompleted}
          onProgressUpdate={onProgressUpdate ?? (() => {})}
          onCompletionMet={onCompletionMet ?? (() => {})}
          onStartViewing={onStartViewing ?? (() => {})}
        />
      );

    case 'image':
      if (!block.url) return (
        <div className="px-6 py-4 text-sm text-slate-500 italic">
          Gambar tidak tersedia.
        </div>
      );
      return (
        <div className="px-6 py-4">
          <ImageBlockViewer
            url={block.url}
            alt={block.title || ''}
          />
        </div>
      );

    case 'file':
      return (
        <div className="px-6 py-4">
          <FileBlockViewer
            url={block.url || ''}
            title={block.title}
          />
        </div>
      );

    case 'quiz':
      if (!quiz) return (
        <div className="px-6 py-4 text-slate-500 text-sm">Kuis tidak ditemukan.</div>
      );
      return (
        <QuizViewer
          quizId={quiz.id}
          title={quiz.title}
          instructions={quiz.instructions}
          questions={quiz.quiz_questions}
          maxAttempts={quiz.max_attempts}
          isCompleted={isCompleted}
          onCompletionMet={onCompletionMet ?? (() => {})}
          onStartViewing={onStartViewing ?? (() => {})}
        />
      );

    case 'assignment':
      if (!assignment) return (
        <div className="px-6 py-4 text-slate-500 text-sm">Tugas tidak ditemukan.</div>
      );
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
      );

    default:
      return null;
  }
}
