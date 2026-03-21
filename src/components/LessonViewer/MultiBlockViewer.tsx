import { useRef, useEffect, useCallback, useState } from 'react';
import { motion } from 'motion/react';
import type { Lesson } from '@/src/features/lessons/types';
import { BlockRenderer } from './BlockRenderer';
import { BLOCK_REGISTRY, isValidBlockType } from '@/src/features/lessons/blockRegistry';
import { BlockSkeleton } from './blocks/BlockSkeleton';
import { useOptionalLearningSession } from '@/src/features/analytics';
import { cn } from '@/src/utils/cn';

interface MultiBlockViewerProps {
  lesson: Lesson;
  isCompleted: boolean;
  savedVideoPosition?: number | null;
  savedVideoBlockId?: string | null;
  onVideoTimeUpdate?: (blockId: string, seconds: number) => void;
  onProgressUpdate: (pct: number) => void;
  onCompletionMet: () => void;
  onStartViewing: () => void;
  onResumeAnchorUpdate?: (anchor: {
    lastBlockId: string;
    lastBlockIndex: number;
    lastBlockOffset: number;
  }) => void;
}

// Color map for block type badge variants
const BLOCK_BADGE_STYLES: Record<string, string> = {
  text:       'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  video:      'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  image:      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  file:       'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  quiz:       'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  assignment: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
};

export function MultiBlockViewer({
  lesson,
  isCompleted,
  savedVideoPosition,
  savedVideoBlockId,
  onVideoTimeUpdate,
  onProgressUpdate,
  onCompletionMet,
  onStartViewing,
  onResumeAnchorUpdate,
}: MultiBlockViewerProps) {
  const blocks = [...(lesson.lesson_resources || [])]
    .map(b => ({ ...b, type: b.type?.toLowerCase() ?? b.type }))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  const completedIds = useRef(new Set<string>());
  const hasCalledCompletion = useRef(false);
  const hasStarted = useRef(false);

  const activeBlockRef = useRef<{ id: string; index: number } | null>(null);

  const { trackEvent } = useOptionalLearningSession();

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

    if (completedIds.current.has(blockId)) return;
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
        markBlockComplete(block.id);
        return;
      }
      const rule = BLOCK_REGISTRY[block.type].completionRule;
      if (rule !== 'scroll' && rule !== 'view') return;
      const el = document.getElementById(`block-${block.id}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [blocks, isCompleted, markBlockComplete]);

  useEffect(() => {
    if (!onResumeAnchorUpdate || isCompleted) return;

    const observer = new IntersectionObserver(
      (entries) => {
        let mostVisible: { id: string; index: number; ratio: number } | null = null;

        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const blockId = entry.target.getAttribute('data-block-id');
            const blockIndex = parseInt(entry.target.getAttribute('data-block-index') || '0', 10);
            if (blockId && !isNaN(blockIndex)) {
              if (!mostVisible || entry.intersectionRatio > mostVisible.ratio) {
                mostVisible = { id: blockId, index: blockIndex, ratio: entry.intersectionRatio };
              }
            }
          }
        });

        if (mostVisible) {
          if (activeBlockRef.current?.id !== mostVisible.id) {
            const blockMeta = blocks.find(b => b.id === mostVisible!.id);
            trackEvent('BLOCK_VIEWED', {
              block_id: mostVisible.id,
              block_type: blockMeta?.type ?? 'unknown',
              time_spent: 0,
            });
          }
          activeBlockRef.current = { id: mostVisible.id, index: mostVisible.index };
        }
      },
      { threshold: [0.3, 0.5, 0.7, 1.0] }
    );

    blocks.forEach((block, idx) => {
      const el = document.getElementById(`block-${block.id}`);
      if (el) {
        el.setAttribute('data-block-index', idx.toString());
        observer.observe(el);
      }
    });

    const saveInterval = setInterval(() => {
      if (activeBlockRef.current && !isCompleted) {
        const blockEl = document.getElementById(`block-${activeBlockRef.current.id}`);
        if (blockEl) {
          const rect = blockEl.getBoundingClientRect();
          const offset = Math.round(window.scrollY - rect.top);
          onResumeAnchorUpdate({
            lastBlockId: activeBlockRef.current.id,
            lastBlockIndex: activeBlockRef.current.index,
            lastBlockOffset: offset,
          });
        }
      }
    }, 5000);

    return () => {
      observer.disconnect();
      clearInterval(saveInterval);
    };
  }, [blocks, isCompleted, onResumeAnchorUpdate, trackEvent]);

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
      if (mountedBlocks.has(block.id)) return;
      const el = document.getElementById(`block-${block.id}`);
      if (el) mountObserver.observe(el);
    });

    return () => mountObserver.disconnect();
  }, [blocks, mountedBlocks]);

  if (blocks.length === 0) return null;

  const total = blocks.length;

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress breadcrumb strip */}
      <div className="sticky top-0 z-20 px-4 py-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {blocks.map((block, idx) => {
          if (!isValidBlockType(block.type)) return null;
          const def = BLOCK_REGISTRY[block.type];
          const Icon = def.icon;
          const done = completedIds.current.has(block.id);
          return (
            <div key={block.id} className="flex items-center gap-1 shrink-0">
              <a
                href={`#block-${block.id}`}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold border transition-all duration-200',
                  done
                    ? 'bg-green-100 border-green-200 text-green-700 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300'
                    : BLOCK_BADGE_STYLES[block.type] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  'hover:opacity-80'
                )}
              >
                <Icon className="w-3 h-3" />
                <span>{def.label}</span>
              </a>
              {idx < total - 1 && (
                <span className="text-slate-300 dark:text-slate-700 text-xs select-none">/</span>
              )}
            </div>
          );
        })}

        {/* Position counter */}
        <span className="ml-auto shrink-0 text-xs text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">
          {completedIds.current.size} / {total} selesai
        </span>
      </div>

      {/* Block list */}
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {blocks.map((block, idx) => {
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

          if (!isValidBlockType(block.type)) return null;
          const def = BLOCK_REGISTRY[block.type];
          const Icon = def.icon;
          const rule = def.completionRule;
          const isActiveBlock = rule === 'watch' || rule === 'submit';

          return (
            <motion.div
              key={block.id}
              id={`block-${block.id}`}
              data-block-id={block.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.05, 0.3) }}
              className="py-2"
            >
              {/* Block type label header */}
              <div className="px-4 pb-1 flex items-center gap-2">
                <span className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border',
                  BLOCK_BADGE_STYLES[block.type] ?? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                  'border-transparent'
                )}>
                  <Icon className="w-3 h-3" />
                  {def.label}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-600">
                  Blok {idx + 1} dari {total}
                </span>
              </div>

              {mountedBlocks.has(block.id) ? (
                <BlockRenderer
                  block={block}
                  quiz={quiz}
                  assignment={assignment}
                  isCompleted={isCompleted}
                  savedVideoPosition={
                    block.type === 'video' && block.id === savedVideoBlockId
                      ? savedVideoPosition
                      : null
                  }
                  onVideoTimeUpdate={(seconds) => onVideoTimeUpdate?.(block.id, seconds)}
                  onCompletionMet={isActiveBlock ? () => markBlockComplete(block.id) : undefined}
                  onProgressUpdate={isActiveBlock ? (pct) => {
                    if (!hasStarted.current) {
                      hasStarted.current = true;
                      onStartViewing();
                    }
                    const blockTotal = blocks.length;
                    if (blockTotal === 0) return;
                    const basePct = (completedIds.current.size / blockTotal) * 100;
                    const blockPct = (pct / 100) * (1 / blockTotal) * 100;
                    onProgressUpdate(Math.min(Math.round(basePct + blockPct), 99));
                  } : undefined}
                  onStartViewing={onStartViewing}
                />
              ) : (
                <BlockSkeleton type={block.type} />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
