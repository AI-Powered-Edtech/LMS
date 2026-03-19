import { useRef, useEffect, useCallback, useState } from 'react';
import type { Lesson } from '@/src/features/lessons/types';
import { BlockRenderer } from './BlockRenderer';
import { BLOCK_REGISTRY, isValidBlockType } from '@/src/features/lessons/blockRegistry';
import { BlockSkeleton } from './blocks/BlockSkeleton';

interface MultiBlockViewerProps {
  lesson: Lesson;
  isCompleted: boolean;
  onProgressUpdate: (pct: number) => void;
  onCompletionMet: () => void;
  onStartViewing: () => void;
}

export function MultiBlockViewer({
  lesson,
  isCompleted,
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
}: MultiBlockViewerProps) {
  const blocks = [...(lesson.lesson_resources || [])]
    .map(b => ({ ...b, type: b.type?.toLowerCase() ?? b.type }))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const completedIds = useRef(new Set<string>());
  const hasCalledCompletion = useRef(false);
  const hasStarted = useRef(false);

  // Lazy mounting: only render blocks when near viewport
  // Initialize with first 3 blocks to cover above-fold content
  const [mountedBlocks, setMountedBlocks] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    blocks.slice(0, 3).forEach(b => initial.add(b.id));
    return initial;
  });

  const markBlockComplete = useCallback((blockId: string) => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      onStartViewing();
    }

    if (completedIds.current.has(blockId)) return; // already counted
    completedIds.current.add(blockId);

    const total = blocks.length;
    const done = completedIds.current.size;
    const pct = total > 0 ? Math.min(Math.round((done / total) * 100), 100) : 100;
    onProgressUpdate(pct);

    if (done >= total && !hasCalledCompletion.current) {
      hasCalledCompletion.current = true;
      onCompletionMet();
    }
  }, [blocks.length, onProgressUpdate, onCompletionMet, onStartViewing]);

  // Single IntersectionObserver for all passive blocks (text, image, file) - completion tracking
  useEffect(() => {
    if (isCompleted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const blockId = entry.target.getAttribute('data-block-id');
            if (blockId) {
              markBlockComplete(blockId);
              observer.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.3 }
    );

    blocks.forEach(block => {
      if (!isValidBlockType(block.type)) {
        markBlockComplete(block.id); // treat unknown types as auto-complete
        return;
      }
      const rule = BLOCK_REGISTRY[block.type].completionRule;
      if (rule !== 'scroll' && rule !== 'view') return;
      const el = document.getElementById(`block-${block.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [blocks, isCompleted, markBlockComplete]);

  // Lazy mount observer — mount blocks 200px before they enter viewport
  useEffect(() => {
    const mountObserver = new IntersectionObserver(
      (entries) => {
        const newMounts: string[] = [];
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const blockId = entry.target.getAttribute('data-block-id');
            if (blockId) {
              newMounts.push(blockId);
              mountObserver.unobserve(entry.target);
            }
          }
        });
        if (newMounts.length > 0) {
          setMountedBlocks(prev => {
            const next = new Set(prev);
            newMounts.forEach(id => next.add(id));
            return next;
          });
        }
      },
      { rootMargin: '200px' }
    );

    blocks.forEach(block => {
      if (mountedBlocks.has(block.id)) return; // already mounted
      const el = document.getElementById(`block-${block.id}`);
      if (el) mountObserver.observe(el);
    });

    return () => mountObserver.disconnect();
  }, [blocks, mountedBlocks]);

  if (blocks.length === 0) return null;

  return (
    <div className="flex-1 flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
      {blocks.map(block => {
        // Match quiz/assignment via explicit FK first, then fallback to first available
        const quiz = block.type === 'quiz'
          ? (block.quiz_id
              ? lesson.quizzes?.find(q => q.id === block.quiz_id)
              : lesson.quizzes?.[0])
          : undefined;

        const assignment = block.type === 'assignment'
          ? (block.assignment_id
              ? lesson.assignments?.find(a => a.id === block.assignment_id)
              : lesson.assignments?.[0])
          : undefined;

        // Guard unknown block types — skip rendering
        if (!isValidBlockType(block.type)) return null;
        const rule = BLOCK_REGISTRY[block.type].completionRule;
        const isActiveBlock = rule === 'watch' || rule === 'submit';

        return (
          <div key={block.id} id={`block-${block.id}`} data-block-id={block.id} className="py-2">
            {mountedBlocks.has(block.id) ? (
              <BlockRenderer
                block={block}
                quiz={quiz}
                assignment={assignment}
                isCompleted={isCompleted}
                onCompletionMet={isActiveBlock ? () => markBlockComplete(block.id) : undefined}
                onProgressUpdate={isActiveBlock ? (pct) => {
                  if (!hasStarted.current) {
                    hasStarted.current = true;
                    onStartViewing();
                  }
                  // Propagate individual block progress for active blocks
                  const total = blocks.length;
                  if (total === 0) return; // guard: prevent division by zero
                  const basePct = (completedIds.current.size / total) * 100;
                  const blockPct = (pct / 100) * (1 / total) * 100;
                  onProgressUpdate(Math.min(Math.round(basePct + blockPct), 99));
                } : undefined}
                onStartViewing={onStartViewing}
              />
            ) : (
              <BlockSkeleton type={block.type} />
            )}
          </div>
        );
      })}
    </div>
  );
}
