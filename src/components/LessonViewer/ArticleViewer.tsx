import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { Sparkles, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/src/utils/cn';

interface ArticleViewerProps {
    content: string;
    minReadingTimeSeconds: number;
    isCompleted: boolean;
    onProgressUpdate: (percentage: number) => void;
    onCompletionMet: () => void;
    onStartViewing: () => void;
}

export function ArticleViewer({
    content,
    minReadingTimeSeconds,
    isCompleted,
    onProgressUpdate,
    onCompletionMet,
    onStartViewing,
}: ArticleViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [readingTime, setReadingTime] = useState(0);
    const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
    const hasCalledCompletion = useRef(false);
    const hasStarted = useRef(false);

    // Active Visibility Timer
    useEffect(() => {
        if (isCompleted) return;

        const timer = setInterval(() => {
            if (!document.hidden) {
                setReadingTime(prev => prev + 1);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [isCompleted]);

    // Calculate progress based on readingtime and scroll
    useEffect(() => {
        if (isCompleted) return;

        const timeProgress = Math.min(Math.round((readingTime / minReadingTimeSeconds) * 50), 50);
        const scrollProgress = hasScrolledToBottom ? 50 : 0;
        onProgressUpdate(timeProgress + scrollProgress);
    }, [readingTime, minReadingTimeSeconds, hasScrolledToBottom, isCompleted, onProgressUpdate]);

    // Check completion conditions
    useEffect(() => {
        if (
            hasScrolledToBottom &&
            readingTime >= minReadingTimeSeconds &&
            !isCompleted &&
            !hasCalledCompletion.current
        ) {
            hasCalledCompletion.current = true;
            onCompletionMet();
        }
    }, [hasScrolledToBottom, readingTime, minReadingTimeSeconds, isCompleted, onCompletionMet]);

    const handleScroll = useCallback(() => {
        if (!hasStarted.current) {
            hasStarted.current = true;
            onStartViewing();
        }
        if (scrollRef.current && !isCompleted) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            if (scrollTop + clientHeight >= scrollHeight - 50) {
                setHasScrolledToBottom(true);
            }
        }
    }, [isCompleted, onStartViewing]);

    const sanitizedHTML = useMemo(() => {
        return DOMPurify.sanitize(content.replace(/\n/g, '<br/>'), {
            USE_PROFILES: { html: true }
        });
    }, [content]);

    return (
        <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-6 md:p-10 lg:p-14 custom-scrollbar"
        >
            <div className="max-w-4xl mx-auto relative">
                {/* Progress tracker */}
                {!isCompleted && (
                    <div className="sticky top-0 z-10 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-200/80 text-blue-800 px-5 py-4 rounded-xl text-sm font-medium flex items-start gap-3 shadow-sm">
                        <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p>Sistem melacak progres membaca Anda. Gulir hingga bawah dan baca minimal {minReadingTimeSeconds} detik.</p>
                            <div className="mt-2 flex items-center gap-4 text-xs font-bold">
                                <span className={cn("flex items-center gap-1", hasScrolledToBottom ? "text-green-600" : "text-slate-500")}>
                                    <CheckCircle className="w-3.5 h-3.5" /> Scroll ke bawah
                                </span>
                                <span className={cn("flex items-center gap-1", readingTime >= minReadingTimeSeconds ? "text-green-600" : "text-slate-500")}>
                                    <Clock className="w-3.5 h-3.5" /> Waktu baca: {readingTime}s / {minReadingTimeSeconds}s
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Article content */}
                <div
                    className="prose prose-slate prose-blue max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-h1:text-3xl prose-h2:text-xl prose-p:leading-relaxed prose-p:text-slate-600 prose-a:text-blue-600 hover:prose-a:text-blue-700 prose-img:rounded-xl prose-pre:rounded-xl prose-pre:bg-slate-50"
                    dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
                />
            </div>
        </div>
    );
}
