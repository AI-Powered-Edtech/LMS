import { Calendar, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useInteractiveProgress } from "../hooks/useInteractiveProgress";
import type { TimelineData, TimelineEvent } from "../types";

interface TimelineBlockProps {
  data: TimelineData;
  blockId: string;
  lessonId: string;
}

export function TimelineBlock({ data, blockId, lessonId }: TimelineBlockProps) {
  const { progress, markComplete, isCompleted } = useInteractiveProgress(
    blockId,
    lessonId,
  );
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (progress?.is_completed) {
      const allIds = new Set((data?.events ?? []).map((e) => e.id));
      setVisibleIds(allIds);
    }
  }, [progress, data?.events]);

  useEffect(() => {
    const events = data?.events ?? [];
    if (!events.length) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        setVisibleIds((prev) => {
          const next = new Set(prev);
          let changed = false;
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute("data-event-id");
              if (id && !next.has(id)) {
                next.add(id);
                changed = true;
              }
            }
          });
          if (changed && next.size === events.length && !isCompleted) {
            markComplete({ viewedAll: true }, 100);
          }
          return changed ? next : prev;
        });
      },
      { threshold: 0.4 },
    );

    itemRefs.current.forEach((el) => {
      if (el) observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [data?.events, isCompleted, markComplete]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const events = [...(data?.events ?? [])].sort((a, b) => a.order - b.order);

  if (!events.length) {
    return (
      <div className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 italic">
        Belum ada event yang ditambahkan.
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-2">
      <div className="flex items-center justify-between text-sm mb-4">
        <span className="text-slate-600 dark:text-slate-400">
          {visibleIds.size} dari {events.length} peristiwa terlihat
        </span>
        {isCompleted && (
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            Selesai
          </span>
        )}
      </div>

      {/* Vertical timeline */}
      <div className="relative pl-8">
        {/* Connecting line */}
        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-200 dark:bg-slate-700" />

        <div className="space-y-6">
          {events.map((event, idx) => (
            <TimelineEventItem
              key={event.id}
              event={event}
              index={idx}
              isVisible={isCompleted || visibleIds.has(event.id)}
              isExpanded={expandedIds.has(event.id)}
              onToggle={() => toggleExpand(event.id)}
              onRef={(el) => {
                if (el) itemRefs.current.set(event.id, el);
                else itemRefs.current.delete(event.id);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TimelineEventItem({
  event,
  index,
  isVisible,
  isExpanded,
  onToggle,
  onRef,
}: {
  event: TimelineEvent;
  index: number;
  isVisible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <motion.div
      ref={onRef}
      data-event-id={event.id}
      initial={{ opacity: 0, x: -16 }}
      animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="relative"
    >
      {/* Timeline dot */}
      <div className="absolute -left-[25px] top-2 w-4 h-4 rounded-full border-2 border-indigo-400 dark:border-indigo-500 bg-white dark:bg-slate-900 z-10 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-indigo-400 dark:bg-indigo-500" />
      </div>

      {/* Event card */}
      <div className="ml-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <button
          className="w-full text-left px-4 py-3 flex items-start gap-3"
          onClick={onToggle}
          aria-expanded={isExpanded}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                <Calendar className="w-3 h-3" />
                {event.date}
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {event.title}
            </p>
          </div>
          <span className="text-slate-400 dark:text-slate-500 mt-0.5 flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>

        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="px-4 pb-4 space-y-2"
          >
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {event.description}
            </p>
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                className="rounded-lg w-full h-auto max-h-48 object-cover border border-slate-200 dark:border-slate-700 mt-2"
                loading="lazy"
                decoding="async"
              />
            )}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
