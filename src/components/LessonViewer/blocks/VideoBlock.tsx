import { useRef, useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Play } from 'lucide-react';
import { parseVideoUrl, type VideoType } from '@/src/utils/videoUtils';

interface VideoBlockProps {
    url: string;
    isCompleted: boolean;
    onProgressUpdate?: (percentage: number) => void;
    onCompletionMet?: () => void;
    onStartViewing?: () => void;
}

/**
 * VideoBlock - A block component for rendering videos (YouTube, Vimeo, or direct)
 * 
 * Features:
 * - YouTube/Vimeo embed support via iframe
 * - Direct video support via video element
 * - Progress tracking using timeupdate (direct) or IntersectionObserver (embed)
 * - 16:9 aspect ratio wrapper
 */
export function VideoBlock({
    url,
    isCompleted,
    onProgressUpdate = () => {},
    onCompletionMet = () => {},
    onStartViewing = () => {},
}: VideoBlockProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const hasCalledCompletion = useRef(false);
    const intersectionStartTime = useRef<number | null>(null);
    const [videoType, setVideoType] = useState<VideoType>('direct');
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);

    // Parse URL on mount or when URL changes
    useEffect(() => {
        if (url) {
            const parsed = parseVideoUrl(url);
            setVideoType(parsed.type);
            setEmbedUrl(parsed.embedUrl);
        } else {
            setVideoType('direct');
            setEmbedUrl(null);
        }
    }, [url]);

    // Progress tracking for direct videos using timeupdate
    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current || videoType !== 'direct') return;
        
        const video = videoRef.current;
        const currentTime = video.currentTime;
        const duration = video.duration;

        if (duration > 0) {
            const percentage = Math.round((currentTime / duration) * 100);
            onProgressUpdate(percentage);

            // Completion: 95% watched
            if (percentage >= 95 && !isCompleted && !hasCalledCompletion.current) {
                hasCalledCompletion.current = true;
                onCompletionMet();
            }
        }
    }, [videoType, isCompleted, onProgressUpdate, onCompletionMet]);

    // Progress tracking for embedded videos (YouTube/Vimeo) using IntersectionObserver + timer
    useEffect(() => {
        if (videoType === 'direct' || !containerRef.current) return;

        const container = containerRef.current;
        let timerId: ReturnType<typeof setTimeout> | null = null;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        onStartViewing();

                        // Start 30s timer when block becomes visible
                        if (!timerId && !isCompleted && !hasCalledCompletion.current) {
                            timerId = setTimeout(() => {
                                if (!hasCalledCompletion.current) {
                                    hasCalledCompletion.current = true;
                                    onProgressUpdate(80);
                                    onCompletionMet();
                                }
                            }, 30000);
                        }
                    } else {
                        // Cancel timer when user scrolls away
                        if (timerId) {
                            clearTimeout(timerId);
                            timerId = null;
                        }
                    }
                });
            },
            { threshold: 0.8 }
        );

        observer.observe(container);

        return () => {
            observer.disconnect();
            if (timerId) clearTimeout(timerId);
        };
    }, [videoType, isCompleted, onProgressUpdate, onCompletionMet, onStartViewing]);

    // Handle video play event
    const handlePlay = useCallback(() => {
        onStartViewing();
    }, [onStartViewing]);

    // Render embedded video (YouTube/Vimeo)
    if (videoType === 'youtube' || videoType === 'vimeo') {
        if (!embedUrl) {
            return <VideoUnavailable />;
        }

        return (
            <div className="px-6 py-4">
                <div 
                    ref={containerRef}
                    className="relative w-full" 
                    style={{ aspectRatio: '16/9' }}
                >
                    <iframe
                        src={embedUrl}
                        className="absolute inset-0 w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        title="Video player"
                    />
                </div>
            </div>
        );
    }

    // Render direct video
    if (videoType === 'direct') {
        if (!url) {
            return <VideoUnavailable />;
        }

        return (
            <div className="px-6 py-4">
                <div 
                    ref={containerRef}
                    className="relative w-full" 
                    style={{ aspectRatio: '16/9' }}
                >
                    <video
                        ref={videoRef}
                        src={url}
                        controls
                        onTimeUpdate={handleTimeUpdate}
                        onPlay={handlePlay}
                        className="absolute inset-0 w-full h-full rounded-lg"
                        controlsList="nodownload"
                    />
                </div>
            </div>
        );
    }

    // Fallback for unknown types
    return <VideoUnavailable />;
}

/**
 * Video unavailable fallback UI
 */
function VideoUnavailable() {
    return (
        <div className="px-6 py-4">
            <div 
                className="relative w-full bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center" 
                style={{ aspectRatio: '16/9' }}
            >
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                    <AlertTriangle className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">Video tidak tersedia</p>
            </div>
        </div>
    );
}
