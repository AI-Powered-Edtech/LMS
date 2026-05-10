import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { CheckCircle, GripVertical, XCircle } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui";
import { useToast } from "@/hooks/useToast";

import { useInteractiveProgress } from "../hooks/useInteractiveProgress";
import type { SortingData, SortingItem } from "../types";
import { scoreSorting } from "../utils/interactiveScoring";

interface SortingBlockProps {
  data: SortingData;
  blockId: string;
  lessonId: string;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function SortingBlock({ data, blockId, lessonId }: SortingBlockProps) {
  const { progress, markComplete, isCompleted } = useInteractiveProgress(
    blockId,
    lessonId,
  );
  const addToast = useToast((s) => s.addToast);

  const initialOrder = useMemo(
    () => shuffleArray(data?.items ?? []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data?.items?.length],
  );

  const [orderedItems, setOrderedItems] = useState<SortingItem[]>(initialOrder);
  const [checked, setChecked] = useState(false);
  const [correctPositions, setCorrectPositions] = useState<number[]>([]);

  // Restore from DB
  useEffect(() => {
    if (progress?.interaction_data?.order) {
      const savedOrder = progress.interaction_data.order as string[];
      const restored = savedOrder
        .map((id) => data.items.find((item) => item.id === id))
        .filter(Boolean) as SortingItem[];
      if (restored.length === data.items.length) {
        setOrderedItems(restored);
        if (progress.is_completed) setChecked(true);
      }
    }
  }, [progress, data.items]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination || isCompleted) return;
    const items = [...orderedItems];
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setOrderedItems(items);
    setChecked(false);
    setCorrectPositions([]);
  };

  const handleCheck = () => {
    const currentOrder = orderedItems.map((i) => i.id);
    const {
      score: _score,
      correctPositions: cp,
      totalCount,
    } = scoreSorting(data, currentOrder);
    setChecked(true);
    setCorrectPositions(cp);

    if (cp.length === totalCount && totalCount > 0) {
      markComplete({ order: currentOrder }, 100);
      addToast({ type: "success", message: "Urutan sudah benar!" });
    } else {
      addToast({
        type: "info",
        message: `${cp.length} dari ${totalCount} item berada di posisi yang benar. Coba lagi!`,
      });
    }
  };

  if (!data?.items?.length) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
        Belum ada item untuk diurutkan.
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4">
      {data.instruction && (
        <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-200 dark:border-slate-700">
          {data.instruction}
        </p>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="sorting-list">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="space-y-2"
            >
              {orderedItems.map((item, idx) => {
                const isCorrect = checked && correctPositions.includes(idx);
                const isIncorrect = checked && !correctPositions.includes(idx);
                return (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={idx}
                    isDragDisabled={isCompleted}
                  >
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                          snap.isDragging
                            ? "shadow-xl bg-indigo-50 dark:bg-indigo-900/30 border-indigo-400 dark:border-indigo-500"
                            : isCorrect
                              ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-200"
                              : isIncorrect
                                ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200"
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <span
                          {...prov.dragHandleProps}
                          className="text-slate-400 dark:text-slate-500 cursor-grab"
                        >
                          <GripVertical className="w-4 h-4" />
                        </span>
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                          {idx + 1}
                        </span>
                        <span className="flex-1">{item.label}</span>
                        {isCorrect && (
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        )}
                        {isIncorrect && (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <div className="flex items-center gap-3 pt-1">
        {!isCompleted && (
          <Button onClick={handleCheck} className="text-sm">
            Periksa Urutan
          </Button>
        )}
        <AnimatePresence>
          {isCompleted && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
            >
              <CheckCircle className="w-4 h-4" />
              Urutan sudah benar! Aktivitas selesai.
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
