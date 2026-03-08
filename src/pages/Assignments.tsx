import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/src/contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, Plus, Search, Filter, Clock, CheckCircle2,
  AlertCircle, Paperclip, Link as LinkIcon, Camera,
  MessageSquare, Send, X, UploadCloud, MoreVertical,
  Calendar as CalendarIcon, Users, FileUp, ArrowRight
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useComments } from "@/src/contexts/CommentContext";
import { useGradebook } from "@/src/contexts/GradebookContext";
import { useCalendar } from "@/src/contexts/CalendarContext";
import { useNotifications } from "@/src/contexts/NotificationContext";

// Mock Data
const mockAssignments = [
  {
    id: "a1",
    title: "Tugas Akhir Sejarah Indonesia",
    type: "individual",
    description: "Buatlah esai minimal 1000 kata mengenai dampak penjajahan Belanda terhadap sistem pendidikan di Indonesia. Sertakan minimal 3 sumber referensi yang valid.",
    dueDate: "2026-03-10T23:59:00",
    status: "assigned", // assigned, turned_in, late, returned
    grade: null,
    maxGrade: 100,
    attachments: [
      { id: 1, name: "Panduan_Penulisan_Esai.pdf", type: "pdf", url: "#" }
    ],
    studentSubmissions: [
      { id: 1, studentName: "Ahmad", status: "turned_in", submittedAt: "2026-03-08T14:30:00", grade: null, uploadedFiles: [{ name: "Tugas_Akhir_Ahmad.pdf", type: "pdf" }] },
      { id: 2, studentName: "Bunga", status: "assigned", submittedAt: null, grade: null, uploadedFiles: [] },
      { id: 999, studentName: "Anda", status: "assigned", submittedAt: null, grade: null, uploadedFiles: [] },
    ],
    comments: [
      { id: 1, author: "Guru", text: "Pastikan format sitasi menggunakan APA style.", time: "2 hari yang lalu" }
    ]
  },
  {
    id: "a2",
    title: "Latihan Soal Matematika Bab 4",
    type: "individual",
    description: "Kerjakan soal latihan di buku cetak halaman 45-46 nomor 1 sampai 10. Foto hasil kerjaan kalian dan unggah ke sini.",
    dueDate: "2026-03-05T12:00:00",
    status: "returned",
    grade: 85,
    maxGrade: 100,
    attachments: [],
    studentSubmissions: [
      { id: 1, studentName: "Ahmad", status: "returned", submittedAt: "2026-03-04T20:15:00", grade: 85 },
      { id: 2, studentName: "Bunga", status: "late", submittedAt: "2026-03-06T08:00:00", grade: 70 },
      { id: 999, studentName: "Anda", status: "returned", submittedAt: "2026-03-04T21:00:00", grade: 90, uploadedFiles: [{ name: "Latihan_Matematika.pdf", type: "pdf" }] },
    ],
    comments: [
      { id: 1, author: "Guru", text: "Kerja bagus, perhatikan lagi rumus nomor 7.", time: "1 hari yang lalu" },
      { id: 2, author: "Ahmad", text: "Baik Pak, terima kasih koreksinya.", time: "10 jam yang lalu" }
    ]
  },
  {
    id: "a3",
    title: "Proyek Kelompok Biologi",
    type: "group",
    description: "Kumpulkan laporan hasil pengamatan pertumbuhan kecambah. Cukup satu perwakilan kelompok yang mengumpulkan.",
    dueDate: "2026-03-15T08:00:00",
    status: "assigned",
    grade: null,
    maxGrade: 100,
    attachments: [
      { id: 1, name: "Format_Laporan.docx", type: "doc", url: "#" }
    ],
    studentSubmissions: [
      { id: 999, studentName: "Anda", status: "assigned", submittedAt: null, grade: null, uploadedFiles: [] }
    ],
    comments: []
  }
];

export function Assignments() {
  const { role } = useAuth();
  const { addEvent } = useCalendar();
  const { addNotification } = useNotifications();
  const { addAssignment: addGradebookAssignment, getStudentGrade } = useGradebook();
  const { addComment, getComments, setInitialComments } = useComments();

  const [assignments, setAssignments] = useState(mockAssignments);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    assignments.forEach(a => {
      a.studentSubmissions.forEach(s => {
        if (a.comments.length > 0) {
          setInitialComments(a.id.toString(), s.id.toString(), a.comments.map(c => ({ ...c, id: c.id.toString() })));
        }
      });
    });
    initialized.current = true;
  }, [assignments, setInitialComments]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all, assigned, turned_in, returned, late
  const [typeFilter, setTypeFilter] = useState("all"); // all, individual, group
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [previewFile, setPreviewFile] = useState<string | null>(null);

  // New Assignment State
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    dueDate: "",
    maxGrade: 100,
    class: "Semua Kelas Aktif",
    type: "individual" as "individual" | "group"
  });

  const activeAssignment = assignments.find(a => a.id === selectedAssignment);

  const filteredAssignments = assignments.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filter === "all" || a.status === filter;
    const matchesType = typeFilter === "all" || a.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleTurnIn = (id: string) => {
    setAssignments(assignments.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: "turned_in",
          studentSubmissions: a.studentSubmissions.map(s =>
            s.studentName === 'Anda'
              ? { ...s, status: "turned_in", submittedAt: new Date().toISOString(), uploadedFiles: [{ name: "Tugas_Saya.pdf", type: "pdf" }] }
              : s
          )
        };
      }
      return a;
    }));
  };

  const handleUnsubmit = (id: string) => {
    setAssignments(assignments.map(a => {
      if (a.id === id) {
        return {
          ...a,
          status: "assigned",
          studentSubmissions: a.studentSubmissions.map(s =>
            s.studentName === 'Anda'
              ? { ...s, status: "assigned", submittedAt: null, uploadedFiles: [] }
              : s
          )
        };
      }
      return a;
    }));
  };

  const handleAddComment = (id: string) => {
    if (!newComment.trim()) return;
    addComment(id.toString(), newComment);
    setNewComment("");
  };

  const handleCreateAssignment = () => {
    if (!newAssignment.title || !newAssignment.dueDate) {
      alert("Mohon lengkapi Judul dan Tenggat Waktu.");
      return;
    }

    const assignmentToAdd = {
      id: `a${Date.now()}`,
      title: newAssignment.title,
      type: newAssignment.type,
      description: newAssignment.description,
      dueDate: newAssignment.dueDate,
      status: "assigned",
      grade: null,
      maxGrade: newAssignment.maxGrade,
      attachments: [],
      studentSubmissions: [
        { id: 1, studentName: "Ahmad", status: "assigned", submittedAt: null, grade: null, uploadedFiles: [] },
        { id: 2, studentName: "Bunga", status: "assigned", submittedAt: null, grade: null, uploadedFiles: [] },
        { id: 999, studentName: "Anda", status: "assigned", submittedAt: null, grade: null, uploadedFiles: [] }
      ],
      comments: []
    };

    setAssignments([assignmentToAdd, ...assignments]);

    // INTEGRATION: Add to Calendar
    const dueDateObj = new Date(newAssignment.dueDate);
    addEvent({
      title: `Tugas: ${newAssignment.title}`,
      date: dueDateObj,
      time: dueDateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      type: "assignment",
      location: "Online",
      description: newAssignment.description,
      priority: "medium",
      completed: false,
      duration: 0
    });

    // INTEGRATION: Add to Gradebook
    addGradebookAssignment({
      id: assignmentToAdd.id.toString(),
      title: newAssignment.title,
      type: 'assignment', // Default to assignment for now
      maxScore: newAssignment.maxGrade,
      date: dueDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
    });

    addNotification({
      type: 'assignment',
      title: 'Tugas Baru Dibuat',
      message: `${newAssignment.title} telah ditugaskan, ditambahkan ke kalender, dan buku nilai.`
    });

    setIsCreateModalOpen(false);
    setNewAssignment({
      title: "",
      description: "",
      dueDate: "",
      maxGrade: 100,
      class: "Semua Kelas Aktif",
      type: "individual"
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Ditugaskan</span>;
      case 'turned_in':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Diserahkan</span>;
      case 'returned':
        return <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Dinilai</span>;
      case 'late':
        return <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Terlambat</span>;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            Tugas Kelas
          </h1>
          <p className="text-slate-500 mt-2">
            {role === 'teacher' ? 'Kelola dan pantau tugas siswa yang terhubung dengan Google Classroom.' : 'Lihat dan kumpulkan tugas Anda di sini.'}
          </p>
        </div>
        {role === 'teacher' && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Buat Tugas Baru
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: List of Assignments */}
        <div className="lg:col-span-1 space-y-4">
          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari tugas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="all">Semua Status</option>
                  <option value="assigned">Ditugaskan</option>
                  <option value="turned_in">Diserahkan</option>
                  <option value="returned">Dinilai</option>
                  <option value="late">Terlambat</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
              <div className="relative flex-1">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Filter className="w-4 h-4" />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-700 appearance-none cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="individual">Individu</option>
                  <option value="group">Kelompok</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          {/* Assignment List */}
          <div className="space-y-3">
            {filteredAssignments.map(assignment => (
              <button
                key={assignment.id}
                onClick={() => setSelectedAssignment(assignment.id)}
                className={cn(
                  "w-full text-left p-4 rounded-2xl border transition-all duration-200",
                  selectedAssignment === assignment.id
                    ? "bg-blue-50 border-blue-200 shadow-sm ring-1 ring-blue-100"
                    : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm"
                )}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={cn(
                    "font-bold text-sm line-clamp-2 pr-2 flex items-center gap-2",
                    selectedAssignment === assignment.id ? "text-blue-900" : "text-slate-800"
                  )}>
                    {assignment.type === 'group' ? <Users className="w-4 h-4 text-indigo-500 shrink-0" /> : <FileText className="w-4 h-4 text-blue-500 shrink-0" />}
                    {assignment.title}
                  </h3>
                  <div className="shrink-0">
                    {getStatusBadge(assignment.status)}
                  </div>
                </div>
                <div className={cn(
                  "flex items-center gap-2 text-xs font-medium",
                  new Date(assignment.dueDate) < new Date() && assignment.status !== 'turned_in' ? "text-red-600" : "text-slate-500"
                )}>
                  <Clock className="w-3.5 h-3.5" />
                  Tenggat: {new Date(assignment.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {new Date(assignment.dueDate) < new Date() && assignment.status !== 'turned_in' && (
                    <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">LATE</span>
                  )}
                </div>
              </button>
            ))}
            {filteredAssignments.length === 0 && (
              <div className="text-center py-8 text-slate-500 text-sm">
                Tidak ada tugas yang ditemukan.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Assignment Details */}
        <div className="lg:col-span-2">
          {activeAssignment ? (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">

              {/* Detail Header */}
              <div className="p-6 sm:p-8 border-b border-slate-100 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  {getStatusBadge(activeAssignment.status)}
                  <div className="flex items-center gap-4 text-sm font-bold text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-slate-400" />
                      Tenggat: {new Date(activeAssignment.dueDate).toLocaleString('id-ID')}
                    </span>
                    {(() => {
                      const studentGrade = role === 'student' ? getStudentGrade('999', activeAssignment.id)?.score : null;
                      const displayGrade = studentGrade !== undefined && studentGrade !== null ? studentGrade : activeAssignment.grade;

                      if (displayGrade !== null && displayGrade !== undefined) {
                        return (
                          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                            Nilai: {displayGrade}/{activeAssignment.maxGrade}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-4">{activeAssignment.title}</h2>
                <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{activeAssignment.description}</p>

                {/* Teacher Attachments */}
                {activeAssignment.attachments.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-bold text-slate-700 mb-3">Lampiran Guru:</h4>
                    <div className="flex flex-wrap gap-3">
                      {activeAssignment.attachments.map(att => (
                        <a key={att.id} href={att.url} className="flex items-center gap-3 p-3 pr-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-blue-300 transition-colors group">
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-red-500 shadow-sm">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600">{att.name}</p>
                            <p className="text-xs text-slate-500 uppercase">{att.type}</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50/50">
                {activeAssignment.type === 'group' ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-6">
                      <Users className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">Tugas Kelompok</h3>
                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                      Tugas ini dikerjakan secara berkelompok. Buka ruang kolaborasi untuk melihat anggota kelompok, berdiskusi, dan mengerjakan tugas bersama.
                    </p>
                    <Link
                      to="/group-assignment"
                      className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm flex items-center gap-2"
                    >
                      Buka Ruang Kolaborasi <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Left: Submission Area (Student) or Submissions List (Teacher) */}
                    <div>
                      {role === 'student' ? (
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-slate-900 text-lg">Tugas Anda</h3>
                            {getStatusBadge(activeAssignment.status)}
                          </div>

                          {/* Student Attachments Area */}
                          <div className="space-y-3 mb-6">
                            {activeAssignment.status === 'assigned' ? (
                              <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-sm font-bold text-slate-700">Belum ada file yang dilampirkan</p>
                                <p className="text-xs text-slate-500 mt-1">Tambahkan file untuk diserahkan</p>
                              </div>
                            ) : (
                              ((activeAssignment.studentSubmissions.find(s => s.studentName === 'Anda') as any)?.uploadedFiles || []).map((file: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-xl">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-blue-600 shadow-sm">
                                      <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{file.name}</p>
                                      <p className="text-xs text-slate-500">{file.type.toUpperCase()}</p>
                                    </div>
                                  </div>
                                  <button className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Action Buttons */}
                          {activeAssignment.status === 'assigned' ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <button className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <FileUp className="w-4 h-4 text-blue-500" /> Drive
                                </button>
                                <button className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <LinkIcon className="w-4 h-4 text-blue-500" /> Link
                                </button>
                                <button className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <Paperclip className="w-4 h-4 text-blue-500" /> File
                                </button>
                                <button className="flex items-center justify-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <Camera className="w-4 h-4 text-blue-500" /> Kamera
                                </button>
                              </div>
                              <button
                                onClick={() => handleTurnIn(activeAssignment.id)}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                              >
                                Serahkan Tugas
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleUnsubmit(activeAssignment.id)}
                              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-colors"
                            >
                              Batalkan Penyerahan
                            </button>
                          )}
                        </div>
                      ) : (
                        // Teacher View: Submissions List
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-900 text-lg">Status Pengumpulan</h3>
                            <div className="text-sm font-bold text-slate-500">
                              {activeAssignment.studentSubmissions.filter(s => s.status === 'turned_in' || s.status === 'returned').length} / {activeAssignment.studentSubmissions.length} Diserahkan
                            </div>
                          </div>
                          <div className="space-y-3">
                            {activeAssignment.studentSubmissions.map(sub => {
                              const gradeEntry = getStudentGrade(sub.id, activeAssignment.id);
                              const displayGrade = gradeEntry?.score !== null ? gradeEntry?.score : sub.grade;
                              const isGraded = displayGrade !== null && displayGrade !== undefined;

                              return (
                                <div key={sub.id} className="flex items-center justify-between p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden">
                                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${sub.studentName}`} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-slate-800">{sub.studentName}</p>
                                      <p className="text-xs text-slate-500">{sub.status === 'assigned' ? 'Belum diserahkan' : sub.status === 'turned_in' ? 'Diserahkan' : 'Dinilai'}</p>
                                    </div>
                                  </div>
                                  {isGraded ? (
                                    <span className="font-bold text-emerald-600">{displayGrade}/100</span>
                                  ) : sub.status === 'turned_in' ? (
                                    <Link
                                      to={`/grader?assignmentId=${activeAssignment.id}&studentId=${sub.id}`}
                                      className="text-xs font-bold text-blue-600 hover:underline"
                                    >
                                      Beri Nilai
                                    </Link>
                                  ) : null}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Private Comments */}
                    <div className="flex flex-col h-full">
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5 text-slate-400" />
                          <h3 className="font-bold text-slate-800">Komentar Pribadi</h3>
                        </div>

                        <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
                          {getComments(activeAssignment.id.toString()).map(comment => (
                            <div key={comment.id} className={cn(
                              "flex flex-col max-w-[85%]",
                              comment.author === (role === 'teacher' ? 'Guru' : 'Anda') ? "ml-auto items-end" : "items-start"
                            )}>
                              <div className={cn(
                                "p-3 rounded-2xl text-sm",
                                comment.author === (role === 'teacher' ? 'Guru' : 'Anda')
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-slate-100 text-slate-800 rounded-tl-none"
                              )}>
                                {comment.text}
                              </div>
                              <span className="text-[10px] text-slate-400 mt-1 font-medium">{comment.author} • {comment.time}</span>
                            </div>
                          ))}
                          {getComments(activeAssignment.id.toString()).length === 0 && (
                            <div className="h-full flex items-center justify-center text-sm text-slate-400 text-center px-4">
                              Belum ada komentar pribadi. Tambahkan komentar untuk berdiskusi dengan {role === 'teacher' ? 'siswa' : 'guru'}.
                            </div>
                          )}
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-white">
                          <div className="flex gap-2 relative">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddComment(activeAssignment.id)}
                              placeholder="Tambahkan komentar..."
                              className="w-full pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                            <button
                              onClick={() => handleAddComment(activeAssignment.id)}
                              disabled={!newComment.trim()}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-12rem)] min-h-[600px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <FileText className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">Pilih Tugas</h3>
              <p className="text-slate-500 max-w-sm">
                Pilih tugas dari daftar di sebelah kiri untuk melihat detail, mengumpulkan tugas, atau memberikan komentar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Assignment Modal (Teacher) */}
      <AnimatePresence>
        {isCreateModalOpen && role === 'teacher' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-3xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Buat Tugas Baru</h2>
                    <p className="text-sm text-slate-500">Tugas akan disinkronkan dengan Google Classroom</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6 bg-slate-50/50">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Judul Tugas</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="Contoh: Esai Sejarah Kemerdekaan"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Petunjuk (Opsional)</label>
                  <textarea
                    rows={4}
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    placeholder="Berikan instruksi yang jelas untuk siswa..."
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Jenis Tugas</label>
                    <select
                      value={newAssignment.type}
                      onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value as "individual" | "group" })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="individual">Individu</option>
                      <option value="group">Kelompok</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Kelas</label>
                    <select
                      value={newAssignment.class}
                      onChange={(e) => setNewAssignment({ ...newAssignment, class: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option>Semua Kelas Aktif</option>
                      <option>Kelas 12 IPA 1</option>
                      <option>Kelas 12 IPS 2</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Siswa</label>
                    <select className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Semua Siswa</option>
                      <option>Pilih Siswa Tertentu...</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Poin Maksimal</label>
                    <input
                      type="number"
                      value={newAssignment.maxGrade}
                      onChange={(e) => setNewAssignment({ ...newAssignment, maxGrade: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Tenggat Waktu (Due Date)</label>
                    <input
                      type="datetime-local"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <label className="text-sm font-bold text-slate-700">Lampiran & Integrasi GCR</label>
                  <div className="flex flex-wrap gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-sm font-bold rounded-xl transition-all">
                      <FileUp className="w-4 h-4" /> Google Drive
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-sm font-bold rounded-xl transition-all">
                      <LinkIcon className="w-4 h-4" /> Link
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-sm font-bold rounded-xl transition-all">
                      <Paperclip className="w-4 h-4" /> Upload File
                    </button>
                  </div>

                  {/* Mock Attachment Control */}
                  <div className="mt-4 p-4 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">Template_Tugas.docx</p>
                        <p className="text-xs text-slate-500">Google Docs</p>
                      </div>
                    </div>
                    <select className="text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>Siswa dapat melihat file</option>
                      <option>Siswa dapat mengedit file</option>
                      <option>Buat salinan untuk tiap siswa</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Cek Plagiarisme (Originality Reports)</p>
                      <p className="text-xs text-slate-500">Bandingkan tugas siswa dengan halaman web dan buku.</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Tambahkan Rubrik Penilaian</p>
                      <p className="text-xs text-slate-500">Gunakan rubrik untuk menilai dan memberikan umpan balik.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 shrink-0 flex items-center justify-between bg-white">
                <button className="text-slate-500 hover:text-slate-700 font-bold text-sm transition-colors">
                  Jadwalkan
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCreateAssignment}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 flex items-center gap-2"
                  >
                    Tugaskan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900">{previewFile}</h3>
                <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 text-center text-slate-500">
                Pratinjau file {previewFile} belum tersedia.
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
