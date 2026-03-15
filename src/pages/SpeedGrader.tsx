import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  FileText, CheckCircle, ChevronLeft, ChevronRight, MessageSquare,
  Save, ArrowLeft, ZoomIn, ZoomOut, Maximize, MousePointer2,
  MessageSquarePlus, Loader2, Check, AlertCircle, X, Sparkles
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
// TODO: AI grading will be routed through backend API (Phase 5)
import { useGradebook } from "@/src/contexts/GradebookContext";
import { useComments } from "@/src/contexts/CommentContext";
import { aiGraderService } from "@/src/services/aiGraderService";



const rubric = [
  {
    id: "r1",
    criterion: "Tata Bahasa & Ejaan",
    description: "Penggunaan tanda baca, struktur kalimat, dan kosakata.",
    maxPoints: 40,
    levels: [
      { points: 10, desc: "Banyak kesalahan, sulit dipahami." },
      { points: 20, desc: "Beberapa kesalahan, makna masih bisa ditangkap." },
      { points: 30, desc: "Sedikit kesalahan, struktur kalimat baik." },
      { points: 40, desc: "Sempurna, kosakata variatif dan tepat." },
    ]
  },
  {
    id: "r2",
    criterion: "Kualitas Argumen",
    description: "Kedalaman analisis dan dukungan bukti.",
    maxPoints: 60,
    levels: [
      { points: 20, desc: "Argumen lemah, tidak ada bukti pendukung." },
      { points: 40, desc: "Argumen cukup baik, bukti kurang relevan." },
      { points: 60, desc: "Argumen sangat kuat, didukung bukti valid." },
    ]
  }
];

type Annotation = {
  id: string;
  x: number;
  y: number;
  text: string;
  isOpen: boolean;
};

const quickComments = [
  "Bagus sekali, argumen sangat kuat!",
  "Perlu referensi lebih lanjut untuk mendukung klaim Anda.",
  "Periksa kembali tata bahasa dan tanda baca.",
  "Struktur kalimat sudah baik, pertahankan!",
  "Analisis kurang mendalam, coba tambahkan contoh konkret."
];

export function SpeedGrader() {
  const { students: contextStudents, grades, updateGrade } = useGradebook();
  const { addComment } = useComments();
  const [searchParams] = useSearchParams();
  const assignmentId = searchParams.get('assignmentId') || 'a2';

  // Map context students to SpeedGrader format
  const students = contextStudents.map(s => ({
    ...s,
    gradeEntry: grades[s.id]?.[assignmentId] ?? { score: null, status: 'ungraded' }
  }));

  const addQuickComment = (comment: string) => {
    setFeedback(prev => prev ? `${prev}\n${comment}` : comment);
  };

  const studentIdParam = searchParams.get('studentId');
  const initialStudentIdx = studentIdParam
    ? Math.max(0, students.findIndex(s => s.id.toString() === studentIdParam))
    : 0;

  const [currentStudentIdx, setCurrentStudentIdx] = useState(initialStudentIdx);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");

  // New States
  const [isLoading, setIsLoading] = useState(false);
  const [isAIGrading, setIsAIGrading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [zoom, setZoom] = useState(100);
  const [activeTool, setActiveTool] = useState<'pointer' | 'comment'>('pointer');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const documentRef = useRef<HTMLDivElement>(null);

  const currentStudent = students[currentStudentIdx];
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const percentage = totalScore;

  // Simulate loading when switching students
  const loadStudentData = () => {
    setIsLoading(true);
    setSaveStatus('idle');
    // Simulate network request
    setTimeout(() => {
      // Load existing data if available
      const existingGrade = grades[currentStudent.id]?.[assignmentId];
      setScores({}); // Reset scores for now, or load from existingGrade if we had per-criterion scores
      setFeedback(existingGrade?.feedback || "");
      setAnnotations([]);
      setZoom(100);
      setActiveTool('pointer');
      setIsLoading(false);
    }, 800);
  };

  useEffect(() => {
    loadStudentData();
  }, [currentStudentIdx]);

  const saveCurrentStudent = (status: 'graded' | 'needs_revision' | 'ungraded' = 'graded') => {
    updateGrade(currentStudent.id as any, assignmentId, totalScore, status, feedback);
    if (feedback.trim()) {
      addComment(assignmentId, feedback);
    }
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleNext = () => {
    saveCurrentStudent();
    if (currentStudentIdx < students.length - 1) {
      setCurrentStudentIdx(s => s + 1);
    }
  };

  const handlePrev = () => {
    saveCurrentStudent();
    if (currentStudentIdx > 0) {
      setCurrentStudentIdx(s => s - 1);
    }
  };

  const handleSaveAndNext = (status: 'graded' | 'needs_revision' = 'graded') => {
    setSaveStatus('saving');

    // Update Gradebook Context
    updateGrade(currentStudent.id as any, assignmentId, totalScore, status, feedback);
    if (feedback.trim()) {
      addComment(assignmentId, feedback);
    }

    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => {
        setSaveStatus('idle');
        handleNext();
      }, 500);
    }, 500);
  };

  // Autosave logic - simplified for context integration
  // We won't auto-save to context to avoid overwriting with partial grades easily, 
  // but we could. For now let's rely on manual "Simpan & Lanjut".

  const handleScoreSelect = (criterionId: string, points: number) => {
    setScores(prev => ({ ...prev, [criterionId]: points }));
  };

  // Annotation logic
  const handleDocumentClick = (e: React.MouseEvent) => {
    if (activeTool !== 'comment' || !documentRef.current) return;

    const rect = documentRef.current.getBoundingClientRect();
    // Calculate relative position based on current zoom
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newAnnotation: Annotation = {
      id: Date.now().toString(),
      x,
      y,
      text: "",
      isOpen: true,
    };

    setAnnotations(prev => [...prev, newAnnotation]);
    // setActiveTool('pointer'); // Removed to allow placing multiple annotations
  };

  const updateAnnotation = (id: string, text: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, text } : a));
  };

  const toggleAnnotation = (id: string) => {
    setAnnotations(prev => prev.map(a => a.id === id ? { ...a, isOpen: !a.isOpen } : a));
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== id));
  };

  const handleAIGrading = async () => {
    if (Object.keys(scores).length > 0 || feedback.trim().length > 0) {
      if (!confirm("Apakah Anda yakin ingin menimpa nilai dan umpan balik yang sudah ada dengan hasil AI?")) {
        return;
      }
    }
    setIsAIGrading(true);
    try {
      const mockEssayText = `Perkembangan Artificial Intelligence (AI) dalam dekade terakhir telah memicu perdebatan sengit mengenai masa depan lapangan pekerjaan. Di satu sisi, banyak yang khawatir bahwa mesin akan menggantikan peran manusia dalam berbagai sektor industri.

Namun, sejarah menunjukkan bahwa setiap revolusi industri selalu menciptakan jenis pekerjaan baru yang sebelumnya tidak pernah terbayangkan. Misalnya, munculnya profesi seperti Prompt Engineer atau AI Ethics Officer.

Pendidikan memainkan peran penting dalam mempersiapkan generasi mendatang untuk menghadapi perubahan ini. Kurikulum harus beradaptasi untuk mengajarkan keterampilan yang tidak mudah diotomatisasi, seperti pemikiran kritis, kreativitas, dan kecerdasan emosional.

Oleh karena itu, AI tidak akan menggantikan manusia, melainkan manusia yang menggunakan AI akan menggantikan manusia yang tidak menggunakannya. Kolaborasi antara kecerdasan buatan dan kecerdasan manusia adalah kunci untuk mencapai kemajuan yang berkelanjutan.`;

      const aiResponse = await aiGraderService.gradeEssay({
        submissionId: `${assignmentId}-${currentStudent.id}`,
        essayText: mockEssayText,
        rubric: rubric.map(r => ({
          criterion: r.criterion,
          maxPoints: r.maxPoints,
          description: r.description
        }))
      });

      // Map scores back to rubric IDs
      const newScores: Record<string, number> = {};
      let aggregatedFeedback = aiResponse.overallFeedback ? aiResponse.overallFeedback + '\n\n' : '';

      rubric.forEach(r => {
        if (aiResponse.scores[r.criterion] !== undefined) {
          newScores[r.id] = aiResponse.scores[r.criterion];
        }
        if (aiResponse.feedback[r.criterion] !== undefined) {
          aggregatedFeedback += `**${r.criterion}**: ${aiResponse.feedback[r.criterion]}\n`;
        }
      });

      setScores(newScores);
      setFeedback(aggregatedFeedback.trim());

    } catch (error: any) {
      console.error("AI Grading failed:", error);
      alert(error.message || "Gagal melakukan penilaian otomatis dengan AI.");
    } finally {
      setIsAIGrading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50 relative">

      {/* Autosave Toast */}
      <AnimatePresence>
        {saveStatus !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={cn(
              "absolute top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full shadow-md text-sm font-medium",
              saveStatus === 'saving' ? "bg-white text-slate-600 border border-slate-200" :
                saveStatus === 'saved' ? "bg-green-50 text-green-700 border border-green-200" :
                  "bg-red-50 text-red-700 border border-red-200"
            )}
          >
            {saveStatus === 'saving' && <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan draf...</>}
            {saveStatus === 'saved' && <><Check className="w-4 h-4" /> Draf tersimpan</>}
            {saveStatus === 'error' && <><AlertCircle className="w-4 h-4" /> Gagal menyimpan. Periksa koneksi.</>}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Topbar */}
      <div className="h-auto md:h-16 py-4 md:py-0 bg-white border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between px-4 md:px-6 shrink-0 gap-4 md:gap-0 z-20">
        <div className="flex items-center gap-4">
          <Link to="/directory" className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm md:text-base">Tugas Esai: Dampak AI</h1>
            <p className="text-xs text-slate-500 font-medium">Tenggat: 24 Okt 2026</p>
          </div>
        </div>

        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <select
            value={currentStudentIdx}
            onChange={(e) => {
              saveCurrentStudent();
              setCurrentStudentIdx(Number(e.target.value));
              loadStudentData();
            }}
            className="text-sm font-bold text-slate-800 bg-transparent border-none focus:ring-0 cursor-pointer"
          >
            {students.map((s, idx) => (
              <option key={s.id} value={idx}>{idx + 1}. {s.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} disabled={currentStudentIdx === 0 || isLoading} className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5 text-slate-600" />
            </button>
            <button onClick={handleNext} disabled={currentStudentIdx === students.length - 1 || isLoading} className="p-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-lg transition-colors">
              <ChevronRight className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* Left: Document Viewer */}
        <div className="flex-1 bg-slate-200/50 flex flex-col relative">

          {/* Document Toolbar */}
          <div className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTool('pointer')}
                className={cn("p-1.5 rounded-md transition-colors", activeTool === 'pointer' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-900")}
                title="Pilih (Pointer)"
              >
                <MousePointer2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveTool('comment')}
                className={cn("p-1.5 rounded-md transition-colors", activeTool === 'comment' ? "bg-white shadow-sm text-blue-600" : "text-slate-500 hover:text-slate-900")}
                title="Tambah Komentar"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(50, z - 10))} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-slate-600 w-12 text-center">{zoom}%</span>
              <button onClick={() => setZoom(z => Math.min(200, z + 10))} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md">
                <ZoomIn className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <button onClick={() => setZoom(100)} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md" title="Fit to Width">
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Area */}
          <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center items-start">
            {isLoading ? (
              // Skeleton Loader
              <div className="w-full max-w-3xl bg-white shadow-sm border border-slate-200 min-h-[800px] p-12 animate-pulse">
                <div className="h-8 bg-slate-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/4 mb-12"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-full"></div>
                  <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-4 bg-slate-200 rounded w-full mt-8"></div>
                  <div className="h-4 bg-slate-200 rounded w-4/5"></div>
                </div>
              </div>
            ) : (
              // Simulated PDF Document
              <div
                ref={documentRef}
                onClick={handleDocumentClick}
                className={cn(
                  "bg-white shadow-md border border-slate-200 p-12 relative origin-top transition-transform duration-200",
                  activeTool === 'comment' ? "cursor-crosshair" : "cursor-default"
                )}
                style={{
                  width: '100%',
                  maxWidth: '800px',
                  minHeight: '1131px', // A4 ratio approx
                  transform: `scale(${zoom / 100})`,
                  marginBottom: `${(zoom > 100 ? (zoom - 100) * 11 : 0)}px` // Adjust margin for scaling
                }}
              >
                <div className="border-b border-slate-200 pb-6 mb-6">
                  <h2 className="text-2xl font-serif font-bold text-slate-900">Dampak Artificial Intelligence terhadap Lapangan Pekerjaan</h2>
                  <p className="text-slate-500 mt-2">Oleh: {currentStudent.name}</p>
                </div>

                <div className="prose prose-slate font-serif leading-loose text-slate-800 max-w-none">
                  <p>
                    Perkembangan Artificial Intelligence (AI) dalam dekade terakhir telah memicu perdebatan sengit mengenai masa depan lapangan pekerjaan. Di satu sisi, banyak yang khawatir bahwa mesin akan menggantikan peran manusia dalam berbagai sektor industri.
                  </p>
                  <p>
                    Namun, sejarah menunjukkan bahwa setiap revolusi industri selalu menciptakan jenis pekerjaan baru yang sebelumnya tidak pernah terbayangkan. Misalnya, munculnya profesi seperti <em>Prompt Engineer</em> atau <em>AI Ethics Officer</em>.
                  </p>
                  <p>
                    Pendidikan memainkan peran penting dalam mempersiapkan generasi mendatang untuk menghadapi perubahan ini. Kurikulum harus beradaptasi untuk mengajarkan keterampilan yang tidak mudah diotomatisasi, seperti pemikiran kritis, kreativitas, dan kecerdasan emosional.
                  </p>
                  <p>
                    Oleh karena itu, AI tidak akan menggantikan manusia, melainkan manusia yang menggunakan AI akan menggantikan manusia yang tidak menggunakannya. Kolaborasi antara kecerdasan buatan dan kecerdasan manusia adalah kunci untuk mencapai kemajuan yang berkelanjutan.
                  </p>
                </div>

                {/* Render Annotations */}
                {annotations.map(ann => (
                  <div
                    key={ann.id}
                    className="absolute"
                    style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                    onClick={(e) => e.stopPropagation()} // Prevent adding new annotation when clicking existing one
                  >
                    <div className="relative group">
                      {/* Pin Icon */}
                      <button
                        onClick={() => toggleAnnotation(ann.id)}
                        className="absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-yellow-400 text-yellow-900 rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform z-10 border-2 border-white"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      {/* Comment Popover */}
                      {ann.isOpen && (
                        <div className="absolute top-4 left-4 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-3 z-20">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Komentar</span>
                            <button onClick={() => deleteAnnotation(ann.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <textarea
                            autoFocus
                            value={ann.text}
                            onChange={(e) => updateAnnotation(ann.id, e.target.value)}
                            placeholder="Ketik komentar di sini..."
                            className="w-full text-sm border-none bg-yellow-50/50 rounded-lg p-2 focus:ring-0 resize-none h-20"
                          />
                          <div className="flex justify-end mt-2">
                            <button onClick={() => toggleAnnotation(ann.id)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700">
                              Selesai
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Rubric Grading Panel */}
        <div className="w-full md:w-96 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col shrink-0 z-20 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">

          {/* Student Info */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentStudent.name}`} alt="" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{currentStudent.name}</h3>
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                  currentStudent.gradeEntry.status === 'graded' ? "bg-green-100 text-green-700" :
                    currentStudent.gradeEntry.status === 'needs_revision' ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700")}>
                  {currentStudent.gradeEntry.status === 'graded' ? 'Sudah Dinilai' :
                    currentStudent.gradeEntry.status === 'needs_revision' ? 'Perlu Revisi' : 'Belum Dinilai'}
                </span>
              </div>
            </div>

            <div className="text-right">
              {isLoading ? (
                <div className="h-8 w-12 bg-slate-200 rounded animate-pulse ml-auto mb-1"></div>
              ) : (
                <div className="text-3xl font-black text-blue-600 tracking-tight">{percentage}</div>
              )}
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nilai Akhir</div>
            </div>
          </div>

          {/* Rubric Matrix */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {isLoading ? (
              // Skeleton for Rubric
              <div className="space-y-8">
                {[1, 2].map(i => (
                  <div key={i} className="space-y-3">
                    <div className="h-5 bg-slate-200 rounded w-1/2"></div>
                    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                    <div className="grid gap-2 mt-4">
                      <div className="h-16 bg-slate-100 rounded-xl"></div>
                      <div className="h-16 bg-slate-100 rounded-xl"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-800">Rubrik Penilaian</h3>
                  <button
                    onClick={handleAIGrading}
                    disabled={isAIGrading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {isAIGrading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {isAIGrading ? 'AI Menilai...' : 'Auto-Grade AI'}
                  </button>
                </div>

                {rubric.map(item => (
                  <div key={item.id} className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800">{item.criterion}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{item.description}</p>
                      </div>
                      <span className="text-sm font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        {scores[item.id] || 0} / {item.maxPoints}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {item.levels.map(level => {
                        const isSelected = scores[item.id] === level.points;
                        return (
                          <button
                            key={level.points}
                            onClick={() => handleScoreSelect(item.id, level.points)}
                            className={cn(
                              "text-left p-3 rounded-xl border text-sm transition-all",
                              isSelected
                                ? "bg-blue-50 border-blue-500 shadow-sm shadow-blue-100"
                                : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                            )}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={cn("font-bold", isSelected ? "text-blue-700" : "text-slate-700")}>{level.points} Poin</span>
                              {isSelected && <CheckCircle className="w-4 h-4 text-blue-500" />}
                            </div>
                            <p className={cn("text-xs leading-relaxed", isSelected ? "text-blue-600/80" : "text-slate-500")}>{level.desc}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* General Feedback */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-slate-400" />
                    Umpan Balik (Opsional)
                  </h4>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    placeholder="Berikan komentar tambahan untuk siswa..."
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all resize-none"
                  />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {quickComments.map((comment, idx) => (
                      <button
                        key={idx}
                        onClick={() => addQuickComment(comment)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {comment}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-6 border-t border-slate-100 bg-white flex gap-2">
            <button
              onClick={() => handleSaveAndNext('needs_revision')}
              disabled={isLoading}
              className="flex-1 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
            >
              <AlertCircle className="w-5 h-5" />
              Minta Revisi
            </button>
            <button
              onClick={() => handleSaveAndNext('graded')}
              disabled={isLoading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-200 active:scale-95 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              Simpan & Lanjut
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
