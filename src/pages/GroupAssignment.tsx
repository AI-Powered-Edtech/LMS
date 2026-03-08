import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/src/contexts/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, FileText, MessageSquare, CheckSquare, 
  UploadCloud, Settings, Clock, CheckCircle2, 
  AlertCircle, Plus, X, Send, UserPlus, FileUp,
  MoreVertical, RefreshCw, Eye, Edit3, PenTool, ArrowLeft
} from "lucide-react";
import { cn } from "@/src/utils/cn";

// Mock Data
const mockGroupData = {
  id: 1,
  title: "Proyek Akhir: Sejarah Revolusi Industri",
  description: "Buatlah presentasi kolaboratif mengenai dampak Revolusi Industri 4.0. Setiap anggota harus berkontribusi pada slide yang berbeda.",
  dueDate: "2026-03-20T23:59:00",
  status: "in_progress", // in_progress, turned_in, graded
  grade: null,
  maxGrade: 100,
  sharedDoc: {
    name: "Presentasi_Kelompok_3.pptx",
    type: "Google Slides",
    url: "#",
    lastEditedBy: "Budi",
    lastEditedAt: "10 menit yang lalu"
  },
  members: [
    { id: 1, name: "Ahmad (Anda)", role: "Leader", avatar: "Ahmad", contribution: 35 },
    { id: 2, name: "Budi", role: "Member", avatar: "Budi", contribution: 40 },
    { id: 3, name: "Citra", role: "Member", avatar: "Citra", contribution: 25 },
  ],
  tasks: [
    { id: 1, title: "Riset Latar Belakang", assignee: "Ahmad", status: "completed" },
    { id: 2, title: "Membuat Desain Slide", assignee: "Citra", status: "in_progress" },
    { id: 3, title: "Menyusun Kesimpulan", assignee: "Budi", status: "pending" },
  ],
  chat: [
    { id: 1, sender: "Budi", text: "Saya sudah mulai kerjakan slide 3 ya.", time: "10:00" },
    { id: 2, sender: "Citra", text: "Oke, saya bantu cari gambar ilustrasinya.", time: "10:05" },
    { id: 3, sender: "Ahmad (Anda)", text: "Mantap, saya fokus ke materi pendahuluan.", time: "10:10" },
  ]
};

const mockAllGroups = [
  { id: 1, name: "Kelompok 1", members: ["Andi", "Bela", "Caca"], status: "turned_in", progress: 100 },
  { id: 2, name: "Kelompok 2", members: ["Deni", "Eka", "Fani"], status: "in_progress", progress: 60 },
  { id: 3, name: "Kelompok 3", members: ["Ahmad", "Budi", "Citra"], status: "in_progress", progress: 85 },
];

export function GroupAssignment() {
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState("workspace"); // workspace, tasks, chat, peer_review
  const [tasks, setTasks] = useState(mockGroupData.tasks);
  const [chat, setChat] = useState(mockGroupData.chat);
  const [newMessage, setNewMessage] = useState("");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPeerReview, setShowPeerReview] = useState(false);

  // Teacher specific state
  const [teacherTab, setTeacherTab] = useState("overview"); // overview, groups, settings
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    setChat([...chat, { id: Date.now(), sender: "Ahmad (Anda)", text: newMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }]);
    setNewMessage("");
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    setTasks([...tasks, { id: Date.now(), title: newTaskTitle, assignee: "Unassigned", status: "pending" }]);
    setNewTaskTitle("");
  };

  const toggleTaskStatus = (id: number) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'completed' : 'pending';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleSyncGCR = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      alert("Berhasil sinkronisasi kelompok dari Google Classroom!");
    }, 1500);
  };

  if (role === 'teacher') {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link to="/assignments" className="p-2 -ml-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                <Users className="w-8 h-8 text-indigo-600" />
                Manajemen Tugas Kelompok
              </h1>
            </div>
            <p className="text-slate-500 mt-2 ml-12">
              Pantau kolaborasi siswa, atur kelompok, dan sinkronisasi dengan Google Classroom.
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleSyncGCR}
              disabled={isSyncing}
              className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5", isSyncing && "animate-spin")} />
              Sync GCR
            </button>
            <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-indigo-200">
              <Plus className="w-5 h-5" />
              Buat Kelompok Baru
            </button>
          </div>
        </div>

        {/* Teacher Tabs */}
        <div className="flex gap-4 border-b border-slate-200">
          {['overview', 'groups', 'settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setTeacherTab(tab)}
              className={cn(
                "pb-4 px-2 text-sm font-bold transition-colors relative",
                teacherTab === tab ? "text-indigo-600" : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab === 'overview' ? 'Ringkasan' : tab === 'groups' ? 'Daftar Kelompok' : 'Pengaturan'}
              {teacherTab === tab && (
                <motion.div layoutId="teacherTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
              )}
            </button>
          ))}
        </div>

        {teacherTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 md:col-span-2">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Aktivitas Terbaru</h3>
              <div className="space-y-4">
                {[
                  { group: "Kelompok 3", action: "mengedit dokumen presentasi", time: "10 menit yang lalu" },
                  { group: "Kelompok 1", action: "mengumpulkan tugas", time: "1 jam yang lalu" },
                  { group: "Kelompok 2", action: "menyelesaikan 2 sub-tugas", time: "2 jam yang lalu" },
                ].map((log, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                      <Edit3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700"><span className="font-bold">{log.group}</span> {log.action}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{log.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Statistik</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Selesai</span>
                    <span className="font-bold text-slate-700">1/3 Kelompok</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-1/3 rounded-full"></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-500">Rata-rata Kontribusi</span>
                    <span className="font-bold text-slate-700">Aktif</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-3/4 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {teacherTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockAllGroups.map(group => (
              <div key={group.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-5 border-b border-slate-100">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-slate-900">{group.name}</h3>
                    {group.status === 'turned_in' ? (
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">Diserahkan</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Proses</span>
                    )}
                  </div>
                  <div className="flex -space-x-2 mt-3">
                    {group.members.map((m, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden" title={m}>
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m}`} alt={m} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5 bg-slate-50 flex-1">
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-500 font-medium">Progress Tugas</span>
                      <span className="font-bold text-slate-700">{group.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${group.progress}%` }}></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Eye className="w-4 h-4" /> Pantau
                    </button>
                    <button className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                      <PenTool className="w-4 h-4" /> Nilai
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {teacherTab === 'settings' && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm max-w-3xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">Pengaturan Tugas Kelompok</h3>
            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Metode Pembagian Kelompok</label>
                <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Otomatis (Acak)</option>
                  <option>Sinkronisasi dari Google Classroom (Student Groups)</option>
                  <option>Pilih Manual</option>
                  <option>Siswa Memilih Sendiri</option>
                </select>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Opsi Kolaborasi Dokumen</label>
                <div className="p-4 border border-slate-200 rounded-xl space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="doc_collab" className="mt-1 w-4 h-4 text-indigo-600" defaultChecked />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Satu Dokumen per Kelompok</p>
                      <p className="text-xs text-slate-500">Sistem akan membuat salinan template untuk setiap kelompok. Semua anggota dalam kelompok yang sama dapat mengedit dokumen tersebut.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="radio" name="doc_collab" className="mt-1 w-4 h-4 text-indigo-600" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Folder Bersama (Shared Folder)</p>
                      <p className="text-xs text-slate-500">Buat folder Google Drive khusus untuk tiap kelompok agar mereka bisa mengunggah banyak file.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-slate-700">Penilaian Sejawat (Peer Assessment)</label>
                <label className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                  <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" defaultChecked />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Wajibkan Penilaian Antar Anggota</p>
                    <p className="text-xs text-slate-500">Siswa harus menilai kontribusi anggota kelompoknya sebelum tugas dianggap selesai.</p>
                  </div>
                </label>
              </div>

              <div className="pt-6 border-t border-slate-200 flex justify-end">
                <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm">
                  Simpan Pengaturan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Student View
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <Link to="/assignments" className="p-1 -ml-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Tugas Kelompok
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Tenggat: {new Date(mockGroupData.dueDate).toLocaleDateString('id-ID')}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">{mockGroupData.title}</h1>
            <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">{mockGroupData.description}</p>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-4">
            <div className="flex -space-x-3">
              {mockGroupData.members.map(m => (
                <div key={m.id} className="w-10 h-10 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative group" title={`${m.name} - ${m.role}`}>
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${m.avatar}`} alt={m.name} className="w-full h-full object-cover" />
                  {m.role === 'Leader' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-amber-400 border border-white rounded-full"></div>
                  )}
                </div>
              ))}
            </div>
            <button 
              onClick={() => setIsSubmitting(true)}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-indigo-200 w-full md:w-auto"
            >
              Serahkan Tugas Kelompok
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Main Column: Workspace & Tasks */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Tabs */}
          <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto hide-scrollbar">
            {[
              { id: 'workspace', icon: FileText, label: 'Ruang Kerja' },
              { id: 'tasks', icon: CheckSquare, label: 'Pembagian Tugas' },
              { id: 'peer_review', icon: Users, label: 'Penilaian Sejawat' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
            
            {activeTab === 'workspace' && (
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Dokumen Kolaborasi</h3>
                  <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                    <FileUp className="w-4 h-4" /> Buka di Drive
                  </button>
                </div>
                
                <div className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-amber-500" />
                  </div>
                  <h4 className="font-bold text-slate-800 mb-1">{mockGroupData.sharedDoc.name}</h4>
                  <p className="text-sm text-slate-500 mb-6">Terakhir diedit oleh {mockGroupData.sharedDoc.lastEditedBy} • {mockGroupData.sharedDoc.lastEditedAt}</p>
                  
                  <button className="px-6 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm text-slate-800 font-bold rounded-xl transition-all flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-indigo-600" />
                    Edit Dokumen Bersama
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="p-6 flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">To-Do List Kelompok</h3>
                  <span className="text-sm font-bold text-slate-500">
                    {tasks.filter(t => t.status === 'completed').length}/{tasks.length} Selesai
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {tasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors group">
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={() => toggleTaskStatus(task.id)}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center border transition-colors",
                            task.status === 'completed' ? "bg-emerald-500 border-emerald-500 text-white" : 
                            task.status === 'in_progress' ? "bg-amber-100 border-amber-300 text-amber-600" :
                            "bg-slate-50 border-slate-300 text-transparent hover:border-indigo-400"
                          )}
                        >
                          {task.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : 
                           task.status === 'in_progress' ? <Clock className="w-4 h-4" /> : 
                           <CheckCircle2 className="w-4 h-4 opacity-0 group-hover:opacity-20 text-indigo-600" />}
                        </button>
                        <div>
                          <p className={cn(
                            "font-bold text-sm transition-colors",
                            task.status === 'completed' ? "text-slate-400 line-through" : "text-slate-800"
                          )}>{task.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">PIC: {task.assignee}</p>
                        </div>
                      </div>
                      <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                      placeholder="Tambah sub-tugas baru..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    <button 
                      onClick={handleAddTask}
                      disabled={!newTaskTitle.trim()}
                      className="px-4 py-2.5 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 font-bold rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'peer_review' && (
              <div className="p-6 flex flex-col h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-slate-900">Penilaian Sejawat</h3>
                  <p className="text-sm text-slate-500 mt-1">Nilai kontribusi anggota kelompok Anda. Penilaian ini bersifat rahasia dan hanya dilihat oleh guru.</p>
                </div>

                <div className="space-y-4 flex-1">
                  {mockGroupData.members.filter(m => m.name !== "Ahmad (Anda)").map(member => (
                    <div key={member.id} className="p-4 border border-slate-200 rounded-2xl bg-slate-50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white overflow-hidden shadow-sm">
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatar}`} alt="" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{member.name}</p>
                          <p className="text-xs text-slate-500">{member.role}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">Tingkat Kontribusi (1-5)</label>
                          <div className="flex gap-2">
                            {[1,2,3,4,5].map(score => (
                              <button key={score} className="w-8 h-8 rounded-lg border border-slate-200 bg-white hover:border-indigo-500 hover:text-indigo-600 text-sm font-bold text-slate-600 transition-colors">
                                {score}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-700 mb-1 block">Komentar (Opsional)</label>
                          <textarea rows={2} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" placeholder="Bagaimana kinerja rekan Anda?"></textarea>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                  <button className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm">
                    Simpan Penilaian
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Right Column: Group Chat */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[600px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-3xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-800">Diskusi Kelompok</h3>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Online
              </span>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30 custom-scrollbar">
              {chat.map(msg => (
                <div key={msg.id} className={cn(
                  "flex flex-col max-w-[85%]",
                  msg.sender === "Ahmad (Anda)" ? "ml-auto items-end" : "items-start"
                )}>
                  <span className="text-[10px] text-slate-500 mb-1 font-medium ml-1">{msg.sender}</span>
                  <div className={cn(
                    "p-3 rounded-2xl text-sm shadow-sm",
                    msg.sender === "Ahmad (Anda)" 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                  )}>
                    {msg.text}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">{msg.time}</span>
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-white rounded-b-3xl">
              <div className="flex gap-2 relative">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ketik pesan..."
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim()}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {isSubmitting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden p-6 text-center"
            >
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Serahkan Tugas Kelompok?</h2>
              <p className="text-slate-500 text-sm mb-6">
                Tugas akan diserahkan atas nama seluruh anggota kelompok. Pastikan semua anggota telah menyelesaikan bagiannya.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsSubmitting(false)}
                  className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={() => {
                    setIsSubmitting(false);
                    alert("Tugas kelompok berhasil diserahkan!");
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors shadow-sm"
                >
                  Ya, Serahkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
