import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PlayCircle, FileText, CheckCircle, Circle, ArrowLeft, Sparkles, AlertTriangle, Lock, Award, Clock, MessageSquare, Box, ArrowRight } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
import * as confetti from "canvas-confetti";
import { useStudentProgress } from "@/src/contexts/StudentProgressContext";

type LessonType = "video" | "reading" | "scorm";

interface Transcript {
  time: number;
  text: string;
}

interface Quiz {
  time: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

// ... existing imports

interface NextNode {
  type: "quiz" | "module" | "assignment";
  url: string;
  label: string;
}

interface Lesson {
  id: string;
  title: string;
  type: LessonType;
  duration?: string;
  content?: string;
  videoUrl?: string;
  scormUrl?: string;
  transcripts?: Transcript[];
  quizzes?: Quiz[];
  prerequisiteId?: string;
  minReadingTime?: number;
  passingScore?: number; // Minimum score required to unlock next lesson
  nextNode?: NextNode;
}

const lessons: Lesson[] = [
  {
    id: "l1",
    title: "Pengenalan Artificial Intelligence",
    type: "video",
    duration: "0:15",
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    passingScore: 80, // Requires 80% score on quiz to pass
    transcripts: [
      { time: 0, text: "Selamat datang di kelas Pengenalan Artificial Intelligence." },
      { time: 3, text: "Hari ini kita akan membahas dasar-dasar AI." },
      { time: 6, text: "AI adalah simulasi kecerdasan manusia yang dimodelkan di dalam mesin." },
      { time: 10, text: "Mari kita lihat contoh penerapannya di dunia nyata." }
    ],
    quizzes: [
      {
        time: 5,
        question: "Apa topik utama yang dibahas dalam video ini?",
        options: ["Sejarah Komputer", "Dasar-dasar AI", "Pemrograman Web", "Desain Grafis"],
        correctAnswer: 1
      }
    ],
    nextNode: {
      type: "module",
      url: "#",
      label: "Lanjut ke Materi Berikutnya"
    }
  },
  {
    id: "l2",
    title: "Konsep Dasar Machine Learning",
    type: "reading",
    duration: "3 min read",
    prerequisiteId: "l1",
    minReadingTime: 5,
    content: `
  # Machine Learning: Sebuah Pengantar
  
  Machine Learning (ML) adalah cabang dari kecerdasan buatan (AI) yang berfokus pada pengembangan sistem yang mampu belajar dari data, mengidentifikasi pola, dan membuat keputusan dengan intervensi manusia yang minimal.
  
  ## Bagaimana Mesin Belajar?
  
  Berbeda dengan pemrograman tradisional di mana kita memberikan aturan (rules) dan data untuk mendapatkan jawaban, dalam Machine Learning kita memberikan data dan jawaban untuk mendapatkan aturan.
  
  1. **Supervised Learning**: Model dilatih menggunakan data yang sudah memiliki label.
  2. **Unsupervised Learning**: Model mencari pola tersembunyi dari data yang tidak berlabel.
  3. **Reinforcement Learning**: Model belajar melalui sistem *reward* dan *punishment* berdasarkan tindakan yang diambilnya dalam suatu lingkungan.
  
  ## Mengapa Ini Penting?
  
  Saat ini, ML ada di mana-mana. Mulai dari rekomendasi film di Netflix, filter spam di email Anda, hingga mobil yang bisa menyetir sendiri. Kemampuannya untuk memproses dan menemukan wawasan dari data dalam jumlah besar (Big Data) membuatnya menjadi teknologi kunci di abad ke-21.
  
  *Terus gulir ke bawah untuk menyelesaikan materi ini...*
  
  <br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
  <br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/><br/>
  
  ## Kesimpulan
  
  Dengan memahami dasar-dasar ini, Anda telah mengambil langkah pertama untuk menguasai teknologi masa depan. Teruslah belajar dan bereksperimen!
      `,
    nextNode: {
      type: "quiz",
      url: "/quiz",
      label: "Mulai Kuis: Konsep Dasar ML"
    }
  },
  {
    id: "l3",
    title: "Simulasi Interaktif (SCORM)",
    type: "scorm",
    duration: "10 min",
    prerequisiteId: "l2",
    scormUrl: "https://example.com/scorm-package", // Placeholder
    nextNode: {
      type: "assignment",
      url: "/assignments",
      label: "Kerjakan Tugas Akhir"
    }
  }
];

export function LessonViewer() {
  const navigate = useNavigate();
  const { lessonProgress, updateLessonProgress } = useStudentProgress();
  const [activeLessonId, setActiveLessonId] = useState(lessons[0].id);
  const [showCompletionToast, setShowCompletionToast] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Video State
  const [currentTime, setCurrentTime] = useState(0);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizAnswered, setQuizAnswered] = useState<Set<number>>(new Set());
  const [quizError, setQuizError] = useState(false);

  // Reading State
  const [readingTime, setReadingTime] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeLesson = lessons.find(l => l.id === activeLessonId)!;
  const completedCount = Object.values(lessonProgress).filter(p => p.status === 'completed').length;
  const isAllCompleted = completedCount === lessons.length;

  const markAsCompleted = useCallback((id: string, score: number = 100) => {
    const currentProgress = lessonProgress[id];
    if (currentProgress?.status !== 'completed') {
      updateLessonProgress(id, 100, 'completed', score);

      // Check if this was the last lesson
      const newCompletedCount = Object.values(lessonProgress).filter(p => p.status === 'completed').length + 1;
      if (newCompletedCount === lessons.length) {
        setTimeout(() => setShowCertificateModal(true), 1500);
      }

      setShowCompletionToast(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });
      setTimeout(() => setShowCompletionToast(false), 3000);
    }
  }, [lessonProgress, updateLessonProgress, lessons.length]);

  // ... existing video tracking logic ...

  // Watch Threshold: 95% to complete (for video without quiz or if quiz passed)
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);

      if (time > maxWatchedTime) {
        setMaxWatchedTime(time);
      }

      if (activeLesson.quizzes) {
        const quizToTrigger = activeLesson.quizzes.find(q =>
          Math.abs(q.time - time) < 0.5 && !quizAnswered.has(q.time)
        );

        if (quizToTrigger && !activeQuiz) {
          videoRef.current.pause();
          setActiveQuiz(quizToTrigger);
        }
      }

      const duration = videoRef.current.duration;
      // Only auto-complete if NO passing score is required OR if no quizzes exist
      if (duration > 0 && (time / duration) >= 0.99 && !activeLesson.passingScore) {
        markAsCompleted(activeLessonId);
      }
    }
  };

  // ... existing seek handling ...

  const handleQuizSubmit = (selectedIndex: number) => {
    if (activeQuiz && selectedIndex === activeQuiz.correctAnswer) {
      setQuizAnswered(prev => new Set(prev).add(activeQuiz.time));
      setActiveQuiz(null);
      setQuizError(false);
      if (videoRef.current) {
        videoRef.current.play();
      }

      // Check if all quizzes are answered to calculate final score
      // For this demo, we assume 1 quiz = 100% score if correct
      if (activeLesson.passingScore) {
        markAsCompleted(activeLessonId, 100);
      }
    } else {
      setQuizError(true);
      setTimeout(() => setQuizError(false), 2000);
    }
  };

  // Prevent Skip (Disable Scrubber)
  const handleSeeking = () => {
    if (videoRef.current) {
      // Allow seeking backwards, but prevent seeking forwards beyond maxWatchedTime + 1 second buffer
      if (videoRef.current.currentTime > maxWatchedTime + 1) {
        videoRef.current.currentTime = maxWatchedTime;
      }
    }
  };

  const handleTranscriptClick = (time: number) => {
    if (videoRef.current) {
      // Only allow clicking transcript if they have watched up to that point
      if (time <= maxWatchedTime) {
        videoRef.current.currentTime = time;
        videoRef.current.play();
      }
    }
  };

  // --- Reading Tracking Logic ---

  // Active Visibility Timer for Reading
  useEffect(() => {
    const isCompleted = lessonProgress[activeLessonId]?.status === 'completed';
    if (activeLesson.type === "reading" && !isCompleted) {
      readingTimerRef.current = setInterval(() => {
        if (!document.hidden) {
          setReadingTime(prev => {
            const newTime = prev + 1;
            // Check completion condition: scrolled to bottom AND min reading time met
            if (hasScrolledToBottom && activeLesson.minReadingTime && newTime >= activeLesson.minReadingTime) {
              markAsCompleted(activeLessonId);
            }
            return newTime;
          });
        }
      }, 1000);
    }

    return () => {
      if (readingTimerRef.current) clearInterval(readingTimerRef.current);
    };
  }, [activeLesson.type, activeLessonId, lessonProgress, hasScrolledToBottom, activeLesson.minReadingTime, markAsCompleted]);

  const handleScroll = () => {
    const isCompleted = lessonProgress[activeLessonId]?.status === 'completed';
    if (scrollRef.current && !isCompleted) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      // Scrolled to bottom (within 50px)
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolledToBottom(true);
        // Check if time requirement is already met
        if (activeLesson.minReadingTime && readingTime >= activeLesson.minReadingTime) {
          markAsCompleted(activeLessonId);
        }
      }
    }
  };

  // Reset state when changing lessons
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
    setCurrentTime(0);
    setMaxWatchedTime(0);
    setActiveQuiz(null);
    setQuizAnswered(new Set());
    setReadingTime(0);
    setHasScrolledToBottom(false);
  }, [activeLessonId]);

  return (
    <div className="max-w-7xl mx-auto flex-1 w-full flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-8">

      {/* Sidebar Navigation */}
      <div className="w-full md:w-80 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0 h-64 md:h-auto">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <Link to="/directory" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
          <h2 className="text-xl font-bold text-slate-800">Modul 1: Dasar AI</h2>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / lessons.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-bold text-slate-500">{completedCount}/{lessons.length}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {lessons.map((lesson) => {
            const isActive = activeLessonId === lesson.id;
            const isCompleted = lessonProgress[lesson.id]?.status === 'completed';

            // Adaptive Learning Logic:
            // Check if prerequisite is completed AND if score requirement is met
            let isLocked = false;
            if (lesson.prerequisiteId) {
              const prereqProgress = lessonProgress[lesson.prerequisiteId];
              const prereqLesson = lessons.find(l => l.id === lesson.prerequisiteId);

              if (!prereqProgress || prereqProgress.status !== 'completed') {
                isLocked = true; // Not completed at all
              } else if (prereqLesson?.passingScore && (prereqProgress.score || 0) < prereqLesson.passingScore) {
                isLocked = true; // Completed but failed score
              }
            }

            return (
              <button
                key={lesson.id}
                onClick={() => !isLocked && setActiveLessonId(lesson.id)}
                disabled={isLocked}
                className={cn(
                  "w-full flex items-start gap-3 p-4 rounded-2xl text-left transition-all",
                  isActive ? "bg-blue-50 border border-blue-200 shadow-sm" : "hover:bg-slate-50 border border-transparent",
                  isLocked && "opacity-60 cursor-not-allowed hover:bg-transparent"
                )}
              >
                <div className="mt-0.5 shrink-0">
                  {isLocked ? (
                    <Lock className="w-5 h-5 text-slate-400" />
                  ) : isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-500 fill-green-100" />
                  ) : (
                    <Circle className={cn("w-5 h-5", isActive ? "text-blue-500" : "text-slate-300")} />
                  )}
                </div>
                <div>
                  <h3 className={cn("font-bold text-sm", isActive ? "text-blue-900" : "text-slate-700")}>
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-medium text-slate-500">
                    {lesson.type === "video" ? <PlayCircle className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                    {lesson.duration}
                    {lesson.passingScore && (
                      <span className="ml-2 text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                        Min. Skor: {lesson.passingScore}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ... rest of the component ... */}
      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-1">
              {activeLesson.type === "video" ? <PlayCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
              {activeLesson.type === "video" ? "Video Pembelajaran" : "Artikel Pembelajaran"}
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{activeLesson.title}</h1>
          </div>

          {lessonProgress[activeLessonId]?.status === 'completed' && (
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-xl font-bold text-sm border border-green-200">
              <CheckCircle className="w-4 h-4" /> Selesai
            </div>
          )}
        </div>

        {/* Content Scrollable Area */}
        <div
          ref={scrollRef}
          onScroll={activeLesson.type === "reading" ? handleScroll : undefined}
          className="flex-1 overflow-y-auto bg-slate-50/50 min-h-[500px] md:min-h-0"
        >
          {activeLesson.type === "video" ? (
            <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
              {/* Video Player */}
              <div className="flex-1">
                <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative group">
                  <video
                    ref={videoRef}
                    src={activeLesson.videoUrl}
                    controls={!activeQuiz}
                    onTimeUpdate={handleTimeUpdate}
                    onSeeking={handleSeeking}
                    className="w-full h-full object-cover"
                    controlsList="nodownload"
                  />

                  {/* In-Video Quiz Overlay */}
                  <AnimatePresence>
                    {activeQuiz && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6 z-20"
                      >
                        <motion.div
                          initial={{ scale: 0.9, y: 20 }}
                          animate={{ scale: 1, y: 0 }}
                          className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                        >
                          <div className="flex items-center gap-2 text-orange-500 font-bold mb-4">
                            <AlertTriangle className="w-5 h-5" />
                            Kuis Interaktif
                          </div>
                          <h3 className="text-lg font-bold text-slate-800 mb-4">{activeQuiz.question}</h3>
                          <div className="space-y-2">
                            {activeQuiz.options.map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleQuizSubmit(idx)}
                                className="w-full text-left p-3 rounded-xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-colors font-medium text-slate-700"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                          {quizError && (
                            <motion.p
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="text-red-500 text-sm font-bold mt-4 text-center"
                            >
                              Jawaban salah, coba lagi!
                            </motion.p>
                          )}
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {lessonProgress[activeLessonId]?.status !== 'completed' && !activeQuiz && (
                    <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Sparkles className="w-3 h-3 text-yellow-400" />
                      Tonton hingga selesai untuk menyelesaikan (Skip dinonaktifkan)
                    </div>
                  )}
                </div>
                <div className="mt-6 bg-white p-6 rounded-2xl border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold text-slate-800">Tentang Video Ini</h3>
                    <Link
                      to="/forum"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-colors border border-indigo-100"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Tanyakan di Ruang Diskusi
                    </Link>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Video ini memberikan gambaran singkat tentang apa itu Artificial Intelligence dan bagaimana ia mengubah cara kita hidup dan bekerja. Pastikan Anda menonton hingga akhir agar sistem mencatat progres Anda secara otomatis.
                  </p>
                </div>
              </div>

              {/* Transcripts Sidebar */}
              {activeLesson.transcripts && (
                <div className="w-full lg:w-80 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[400px] lg:h-auto shrink-0">
                  <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" />
                      Transkrip Interaktif
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {activeLesson.transcripts.map((transcript, idx) => {
                      const isPast = currentTime >= transcript.time;
                      const isNext = activeLesson.transcripts![idx + 1] ? currentTime < activeLesson.transcripts![idx + 1].time : true;
                      const isActive = isPast && isNext;
                      const isLocked = transcript.time > maxWatchedTime;

                      return (
                        <button
                          key={idx}
                          onClick={() => handleTranscriptClick(transcript.time)}
                          disabled={isLocked}
                          className={cn(
                            "w-full text-left p-3 rounded-xl transition-all text-sm",
                            isActive ? "bg-blue-50 border-blue-200 border shadow-sm" : "hover:bg-slate-50 border border-transparent",
                            isLocked && "opacity-50 cursor-not-allowed hover:bg-transparent"
                          )}
                        >
                          <span className={cn("text-xs font-bold block mb-1", isActive ? "text-blue-600" : "text-slate-400")}>
                            {Math.floor(transcript.time / 60)}:{(transcript.time % 60).toString().padStart(2, '0')}
                            {isLocked && <Lock className="inline-block w-3 h-3 ml-1" />}
                          </span>
                          <span className={cn(isActive ? "text-slate-900 font-medium" : "text-slate-600")}>
                            {transcript.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : activeLesson.type === "reading" ? (
            <div className="p-8 max-w-3xl mx-auto bg-white min-h-full border-x border-slate-100 shadow-sm relative">
              {lessonProgress[activeLessonId]?.status !== 'completed' && (
                <div className="sticky top-0 z-10 mb-8 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-xl text-sm font-medium flex items-start gap-3 shadow-sm">
                  <Sparkles className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p>Sistem melacak progres membaca Anda. Gulir hingga ke bagian paling bawah artikel dan baca minimal {activeLesson.minReadingTime} detik.</p>
                    <div className="mt-2 flex items-center gap-4 text-xs font-bold">
                      <span className={cn("flex items-center gap-1", hasScrolledToBottom ? "text-green-600" : "text-slate-500")}>
                        <CheckCircle className="w-3.5 h-3.5" /> Scroll ke bawah
                      </span>
                      <span className={cn("flex items-center gap-1", readingTime >= (activeLesson.minReadingTime || 0) ? "text-green-600" : "text-slate-500")}>
                        <Clock className="w-3.5 h-3.5" /> Waktu baca: {readingTime}s / {activeLesson.minReadingTime}s
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="prose prose-slate prose-blue max-w-none mb-12">
                <div dangerouslySetInnerHTML={{ __html: activeLesson.content?.replace(/\n/g, '<br/>') || '' }} />
              </div>

              <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-800">Ada pertanyaan tentang materi ini?</h3>
                  <p className="text-slate-500 text-sm mt-1">Diskusikan dengan pengajar dan teman sekelas Anda.</p>
                </div>
                <Link
                  to="/forum"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-bold transition-colors border border-indigo-100"
                >
                  <MessageSquare className="w-4 h-4" />
                  Tanyakan di Ruang Diskusi
                </Link>
              </div>
            </div>
          ) : activeLesson.type === "scorm" ? (
            <div className="p-4 md:p-6 max-w-6xl mx-auto flex flex-col gap-6 h-full">
              <div className="flex-1 bg-slate-900 rounded-2xl overflow-hidden shadow-lg border border-slate-200 relative">
                {/* Simulated SCORM iframe */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Box className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-lg font-medium">SCORM Package Viewer</p>
                  <p className="text-sm opacity-70 mb-6">{activeLesson.scormUrl}</p>

                  {lessonProgress[activeLessonId]?.status !== 'completed' && (
                    <button
                      onClick={() => markAsCompleted(activeLessonId)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      Simulasikan Selesai (SCORM API)
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Next Node Button */}
          {lessonProgress[activeLessonId]?.status === 'completed' && activeLesson.nextNode && (
            <div className="p-6 max-w-6xl mx-auto mt-4 border-t border-slate-200 flex justify-end">
              <Link
                to={activeLesson.nextNode.url}
                className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200"
              >
                {activeLesson.nextNode.label}
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>

        {/* Success Toast Overlay */}
        <AnimatePresence>
          {showCompletionToast && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 z-50"
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="font-bold text-lg">Luar Biasa!</h4>
                <p className="text-slate-300 text-sm">Materi diselesaikan otomatis. +50 XP</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Certificate Modal */}
        <AnimatePresence>
          {showCertificateModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden p-8 text-center relative"
              >
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-amber-100 to-orange-100"></div>
                <div className="relative z-10">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-md border-4 border-amber-50">
                    <Award className="w-10 h-10 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Modul Selesai!</h2>
                  <p className="text-slate-600 mb-6">
                    Selamat! Anda telah menyelesaikan seluruh materi dalam modul ini. Sertifikat Anda telah diterbitkan secara otomatis.
                  </p>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => navigate('/certificates')}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors shadow-sm"
                    >
                      Lihat Sertifikat
                    </button>
                    <button
                      onClick={() => setShowCertificateModal(false)}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
