import { useRef, useState, useEffect, useCallback } from 'react';
import { PlayCircle, Sparkles, AlertTriangle, Lock, FileText, MessageSquare } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { motion, AnimatePresence } from 'motion/react';
import type { LessonResource } from '@/src/services/lessonService';

interface Transcript {
    time: number;
    text: string;
}

interface InVideoQuiz {
    time: number;
    question: string;
    options: string[];
    correctAnswer: number;
}

interface VideoViewerProps {
    videoUrl: string;
    transcripts?: Transcript[];
    inVideoQuizzes?: InVideoQuiz[];
    savedPosition: number;
    isCompleted: boolean;
    onProgressUpdate: (percentage: number, position: number) => void;
    onCompletionMet: () => void;
    onStartViewing: () => void;
    onSeedDummyVideo?: () => void;
}

export function VideoViewer({
    videoUrl,
    transcripts,
    savedPosition,
    isCompleted,
    onProgressUpdate,
    onCompletionMet,
    onStartViewing,
    onSeedDummyVideo,
}: VideoViewerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [maxWatchedTime, setMaxWatchedTime] = useState(savedPosition);
    const [isSeeding, setIsSeeding] = useState(false);
    const [isStalled, setIsStalled] = useState(false); // New state for buffering/network issue
    const hasCalledCompletion = useRef(false);

    // Session restore: seek to saved position
    useEffect(() => {
        if (videoRef.current && savedPosition > 0) {
            videoRef.current.currentTime = savedPosition;
            setMaxWatchedTime(savedPosition);
        }
    }, [savedPosition]);

    const handleTimeUpdate = useCallback(() => {
        if (!videoRef.current) return;
        const time = videoRef.current.currentTime;
        const duration = videoRef.current.duration;
        setCurrentTime(time);

        if (time > maxWatchedTime) {
            setMaxWatchedTime(time);
        }

        if (duration > 0) {
            const percentage = Math.round((Math.max(time, maxWatchedTime) / duration) * 100);
            onProgressUpdate(percentage, Math.floor(time));

            // Completion: 95% watched
            if (percentage >= 95 && !isCompleted && !hasCalledCompletion.current) {
                hasCalledCompletion.current = true;
                onCompletionMet();
            }
        }
    }, [maxWatchedTime, isCompleted, onProgressUpdate, onCompletionMet]);

    // Anti-skip: prevent seeking beyond maxWatchedTime
    const handleSeeking = useCallback(() => {
        if (videoRef.current && videoRef.current.currentTime > maxWatchedTime + 1) {
            videoRef.current.currentTime = maxWatchedTime;
        }
    }, [maxWatchedTime]);

    const handlePlay = useCallback(() => {
        onStartViewing();
    }, [onStartViewing]);

    const handleTranscriptClick = (time: number) => {
        if (videoRef.current && time <= maxWatchedTime) {
            videoRef.current.currentTime = time;
            videoRef.current.play();
        }
    };

    const handleSeedClick = async () => {
        if (!onSeedDummyVideo) return;
        setIsSeeding(true);
        try {
            await onSeedDummyVideo();
        } catch (error) {
            console.error("Failed to seed dummy video", error);
            setIsSeeding(false);
        }
    };

    // Video buffering/network error handling
    const handleWaitingOrStalled = useCallback(() => {
        setIsStalled(true);
    }, []);

    const handleCanPlay = useCallback(() => {
        setIsStalled(false);
    }, []);

    // Global online recovery listener
    useEffect(() => {
        const handleOnline = () => {
            if (videoRef.current && isStalled) {
                console.log("[VideoViewer] Back online, recovering video playback...");
                const currentPos = videoRef.current.currentTime;
                videoRef.current.load();
                videoRef.current.currentTime = currentPos;
                videoRef.current.play().catch(e => console.error("Recovery play failed", e));
            }
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [isStalled]);

    return (
        <div className="w-full h-full overflow-y-auto custom-scrollbar flex flex-col lg:flex-row md:gap-8 max-w-[1400px] mx-auto p-6 md:p-10">
            {/* Empty State */}
            {!videoUrl ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center min-h-[400px]">
                    <div className="w-16 h-16 bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center justify-center mb-4">
                        <AlertTriangle className="w-8 h-8 text-slate-400" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Video Belum Tersedia</h2>
                    <p className="text-slate-500 max-w-md mb-6">
                        Materi video untuk pelajaran ini belum ditambahkan. Jika Anda adalah instruktur, silakan masukkan URL video terlebih dahulu.
                    </p>

                    {import.meta.env.DEV && onSeedDummyVideo && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl max-w-md w-full">
                            <p className="text-sm text-yellow-800 font-medium mb-3">
                                🛠️ Development Mode Only
                            </p>
                            <button
                                onClick={handleSeedClick}
                                disabled={isSeeding}
                                className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isSeeding ? "Seeding..." : "Seed Dummy Video (BigBuckBunny)"}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                /* Video Player */
                <div className="flex-1 flex flex-col min-w-0">
                    <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-xl border border-slate-200/50 relative group">
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            onSeeking={handleSeeking}
                            onPlay={handlePlay}
                            onWaiting={handleWaitingOrStalled}
                            onStalled={handleWaitingOrStalled}
                            onError={handleWaitingOrStalled}
                            onCanPlay={handleCanPlay}
                            className="w-full h-full object-cover"
                            controlsList="nodownload"
                        />

                        {/* Network Stall Overlay */}
                        <AnimatePresence>
                            {isStalled && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white z-20"
                                >
                                    <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
                                    <h3 className="text-xl font-bold mb-2">Koneksi Terputus...</h3>
                                    <p className="text-sm text-slate-300">Menunggu jaringan kembali stabil. Video akan otomatis dilanjutkan.</p>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {!isCompleted && !isStalled && (
                            <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                <Sparkles className="w-3 h-3 text-yellow-400" />
                                Tonton hingga selesai (skip dinonaktifkan)
                            </div>
                        )}
                    </div>

                    <div className="mt-6 bg-gradient-to-r from-white to-slate-50/50 p-6 rounded-2xl border border-slate-100 w-full mb-6 lg:mb-0 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-800 text-base">Tentang Video Ini</h3>
                            <button className="hidden sm:flex items-center gap-2 text-blue-600 bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors">
                                <MessageSquare className="w-4 h-4" />
                                Tanyakan di Ruang Diskusi
                            </button>
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Pastikan Anda menonton hingga akhir agar sistem mencatat progres Anda secara otomatis.
                        </p>
                    </div>
                </div>
            )}

            {/* Transcripts */}
            {transcripts && transcripts.length > 0 && (
                <div className="w-full lg:w-96 bg-white rounded-2xl border border-slate-200 flex flex-col h-[500px] shrink-0 sticky top-0 mt-6 lg:mt-0">
                    <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white rounded-t-2xl z-10 shrink-0">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            Transkrip Interaktif
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {transcripts.map((transcript, idx) => {
                            const isPast = currentTime >= transcript.time;
                            const isNext = transcripts[idx + 1] ? currentTime < transcripts[idx + 1].time : true;
                            const isActive = isPast && isNext;
                            const isLocked = transcript.time > maxWatchedTime;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleTranscriptClick(transcript.time)}
                                    disabled={isLocked}
                                    className={cn(
                                        "w-full text-left p-4 rounded-xl transition-all text-sm border",
                                        isActive
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-white border-transparent hover:border-slate-200",
                                        isLocked && "opacity-60 cursor-not-allowed hover:bg-transparent"
                                    )}
                                >
                                    <span className={cn(
                                        "text-xs font-bold block mb-1.5 flex items-center gap-1.5",
                                        isActive ? "text-blue-600" : "text-blue-400/70"
                                    )}>
                                        {Math.floor(transcript.time / 60)}:{(transcript.time % 60).toString().padStart(2, '0')}
                                        {isLocked && <Lock className="w-3 h-3 text-slate-400" />}
                                    </span>
                                    <span className={cn(
                                        "leading-relaxed",
                                        isActive ? "text-slate-800 font-medium" : "text-slate-500"
                                    )}>
                                        {transcript.text}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
