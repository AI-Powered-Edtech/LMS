import { useState } from "react";
import { Bell, Megaphone, Calendar as CalendarIcon, User, ChevronRight, Plus, Search, Filter, Pin, Paperclip, MessageSquare, CheckCircle2, Clock, MapPin, Users, Send, Eye, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/utils/cn";
import { useAuth } from "@/src/contexts/AuthContext";

interface Comment {
  id: number;
  author: string;
  text: string;
  time: string;
}

interface Attachment {
  name: string;
  type: "pdf" | "image" | "doc";
  size: string;
}

interface Announcement {
  id: number;
  title: string;
  content: string;
  author: string;
  contactPerson?: string;
  date: string;
  time?: string;
  location?: string;
  isRead: boolean;
  priority: "high" | "normal" | "low";
  targetAudience: string[];
  isPinned: boolean;
  attachments?: Attachment[];
  readCount?: { read: number; total: number };
  allowComments: boolean;
  comments?: Comment[];
  requiresRSVP?: boolean;
  rsvpStatus?: "attending" | "not_attending" | "pending";
}

const initialAnnouncements: Announcement[] = [
  {
    id: 1,
    title: "Perubahan Jadwal Ujian Tengah Semester & Aturan Baru",
    content: "Mohon diperhatikan bahwa jadwal UTS diundur menjadi tanggal 20 Oktober 2026. \n\nPoin penting:\n• Bawa kartu ujian fisik\n• Hadir 15 menit sebelum ujian dimulai\n• Dilarang membawa alat komunikasi ke dalam ruang ujian.",
    author: "Bpk. Budi Santoso (Kepala Sekolah)",
    contactPerson: "Ibu Rina (Bagian Akademik - 08123456789)",
    date: "10 Okt 2026",
    time: "08:00 WIB",
    location: "Aula Utama & Ruang Kelas Masing-masing",
    isRead: false,
    priority: "high",
    targetAudience: ["Semua Siswa", "Guru"],
    isPinned: true,
    attachments: [
      { name: "Jadwal_UTS_Revisi.pdf", type: "pdf", size: "2.4 MB" }
    ],
    readCount: { read: 450, total: 500 },
    allowComments: false,
    requiresRSVP: true,
    rsvpStatus: "pending"
  },
  {
    id: 2,
    title: "Pendaftaran Lomba Desain UI/UX Tingkat Nasional",
    content: "Pendaftaran lomba desain UI/UX tingkat nasional telah dibuka. Bagi mahasiswa yang berminat, silakan mendaftar melalui link yang telah disediakan. Pemenang akan mendapatkan beasiswa penuh untuk semester depan.",
    author: "Ibu Siti Aminah",
    date: "08 Okt 2026",
    isRead: true,
    priority: "normal",
    targetAudience: ["Kelas 11", "Kelas 12"],
    isPinned: false,
    readCount: { read: 120, total: 200 },
    allowComments: true,
    comments: [
      { id: 1, author: "Andi Saputra", text: "Apakah ada biaya pendaftaran, Bu?", time: "1 jam yang lalu" },
      { id: 2, author: "Ibu Siti Aminah", text: "Gratis untuk perwakilan sekolah, Andi.", time: "45 menit yang lalu" }
    ]
  },
  {
    id: 3,
    title: "Pemeliharaan Server EduSync",
    content: "Akan dilakukan pemeliharaan server pada hari Sabtu, 15 Oktober 2026 pukul 00:00 - 04:00 WIB. Selama waktu tersebut, aplikasi EduSync tidak dapat diakses. Mohon simpan semua tugas Anda sebelum waktu tersebut.",
    author: "Admin IT",
    contactPerson: "Helpdesk IT (helpdesk@sekolah.id)",
    date: "05 Okt 2026",
    isRead: true,
    priority: "normal",
    targetAudience: ["Semua Warga Sekolah"],
    isPinned: false,
    readCount: { read: 890, total: 1000 },
    allowComments: false
  },
];

export function Announcements() {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState(initialAnnouncements);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all"); // all, unread, pinned
  const [expandedComments, setExpandedComments] = useState<number | null>(null);
  const [newComment, setNewComment] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleMarkAsRead = (id: number) => {
    setAnnouncements(announcements.map(a => a.id === id ? { ...a, isRead: true } : a));
  };

  const handleRSVP = (id: number, status: "attending" | "not_attending") => {
    setAnnouncements(announcements.map(a => a.id === id ? { ...a, rsvpStatus: status, isRead: true } : a));
  };

  const handleAddComment = (id: number) => {
    if (!newComment.trim()) return;
    
    setAnnouncements(announcements.map(a => {
      if (a.id === id) {
        const comments = a.comments || [];
        return {
          ...a,
          comments: [...comments, { id: Date.now(), author: "Anda", text: newComment, time: "Baru saja" }]
        };
      }
      return a;
    }));
    setNewComment("");
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || a.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === "all" ? true :
      filter === "unread" ? !a.isRead :
      filter === "pinned" ? a.isPinned : true;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => {
    // Pinned always on top
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-blue-600" />
            Pengumuman
          </h1>
          <p className="text-slate-500 mt-2">
            Informasi penting, jadwal, dan pembaruan dari sekolah.
          </p>
        </div>
        {role === 'teacher' && (
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 transition-colors shadow-sm shadow-blue-200"
          >
            <Plus className="w-5 h-5" />
            Buat Pengumuman
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari pengumuman..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar">
          <button
            onClick={() => setFilter("all")}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors",
              filter === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2",
              filter === "unread" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            )}
          >
            Belum Dibaca
            {announcements.filter(a => !a.isRead).length > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-md text-xs">
                {announcements.filter(a => !a.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter("pinned")}
            className={cn(
              "whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-colors flex items-center gap-2",
              filter === "pinned" ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-600 hover:bg-amber-100"
            )}
          >
            <Pin className="w-4 h-4" /> Disematkan
          </button>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-6">
        {filteredAnnouncements.map((announcement, index) => (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "bg-white rounded-3xl border transition-all duration-300 hover:shadow-md relative overflow-hidden group",
              !announcement.isRead ? "border-blue-200 shadow-sm" : "border-slate-200",
              announcement.isPinned && "border-amber-200 ring-1 ring-amber-100"
            )}
          >
            {/* Unread Indicator */}
            {!announcement.isRead && (
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
            )}
            
            <div className="p-6 sm:p-8">
              {/* Header: Badges & Pin */}
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {announcement.isPinned && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                      <Pin className="w-3.5 h-3.5" /> Penting
                    </span>
                  )}
                  {announcement.targetAudience.map((audience, i) => (
                    <span key={i} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                      <Users className="w-3.5 h-3.5" /> {audience}
                    </span>
                  ))}
                  {announcement.priority === "high" && !announcement.isPinned && (
                    <span className="px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full uppercase tracking-wider">
                      Darurat
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                  <span className="flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4" />
                    {announcement.date}
                  </span>
                </div>
              </div>
              
              {/* Title & Content */}
              <h2 className={cn(
                "text-2xl font-bold mb-4",
                !announcement.isRead ? "text-slate-900" : "text-slate-800"
              )}>
                {announcement.title}
              </h2>
              
              <div className="prose prose-slate max-w-none mb-6">
                <p className="whitespace-pre-wrap text-slate-600 leading-relaxed">
                  {announcement.content}
                </p>
              </div>

              {/* Metadata Grid (Time, Location, Contact) */}
              {(announcement.time || announcement.location || announcement.contactPerson) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  {announcement.time && (
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Waktu</p>
                        <p className="text-sm font-medium text-slate-700">{announcement.time}</p>
                      </div>
                    </div>
                  )}
                  {announcement.location && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lokasi</p>
                        <p className="text-sm font-medium text-slate-700">{announcement.location}</p>
                      </div>
                    </div>
                  )}
                  {announcement.contactPerson && (
                    <div className="flex items-start gap-3 sm:col-span-2">
                      <User className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kontak Person</p>
                        <p className="text-sm font-medium text-slate-700">{announcement.contactPerson}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              {announcement.attachments && announcement.attachments.length > 0 && (
                <div className="mb-6 space-y-2">
                  <p className="text-sm font-bold text-slate-700">Lampiran:</p>
                  <div className="flex flex-wrap gap-3">
                    {announcement.attachments.map((file, i) => (
                      <a key={i} href="#" className="flex items-center gap-3 p-3 pr-4 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Paperclip className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{file.name}</p>
                          <p className="text-xs text-slate-500">{file.size} • {file.type.toUpperCase()}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* RSVP / Confirmation Section */}
              {announcement.requiresRSVP && role === 'student' && (
                <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="font-bold text-blue-900">Konfirmasi Kehadiran / Pemahaman</h4>
                    <p className="text-sm text-blue-700 mt-1">Mohon konfirmasi apakah Anda telah membaca dan memahami pengumuman ini.</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {announcement.rsvpStatus === "pending" ? (
                      <>
                        <button 
                          onClick={() => handleRSVP(announcement.id, "attending")}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                        >
                          Saya Mengerti
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                        Telah Dikonfirmasi
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer: Author, Read Receipts, Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                    <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${announcement.author}`} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{announcement.author}</p>
                    {role === 'teacher' && announcement.readCount && (
                      <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                        <Eye className="w-3.5 h-3.5" /> Dibaca oleh {announcement.readCount.read}/{announcement.readCount.total}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {announcement.allowComments && (
                    <button 
                      onClick={() => setExpandedComments(expandedComments === announcement.id ? null : announcement.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-bold rounded-xl transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                      {announcement.comments?.length || 0} Komentar
                    </button>
                  )}
                  
                  {!announcement.isRead && role === 'student' && !announcement.requiresRSVP && (
                    <button
                      onClick={() => handleMarkAsRead(announcement.id)}
                      className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Tandai Dibaca
                    </button>
                  )}
                </div>
              </div>

              {/* Comments Section (Expandable) */}
              <AnimatePresence>
                {expandedComments === announcement.id && announcement.allowComments && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-6 pt-6 border-t border-slate-100 space-y-6">
                      <h4 className="font-bold text-slate-800">Komentar & Diskusi</h4>
                      
                      <div className="space-y-4">
                        {announcement.comments?.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0 overflow-hidden">
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author}`} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-bold text-slate-900">{comment.author}</span>
                                <span className="text-xs text-slate-500">{comment.time}</span>
                              </div>
                              <p className="text-sm text-slate-700">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 mt-4">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full shrink-0 flex items-center justify-center font-bold text-sm">
                          A
                        </div>
                        <div className="flex-1 relative">
                          <input 
                            type="text" 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddComment(announcement.id)}
                            placeholder="Tulis komentar atau pertanyaan..."
                            className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                          />
                          <button 
                            onClick={() => handleAddComment(announcement.id)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </motion.div>
        ))}

        {filteredAnnouncements.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2">Tidak ada pengumuman</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              Belum ada pengumuman baru yang sesuai dengan filter atau pencarian Anda.
            </p>
          </div>
        )}
      </div>

      {/* Create Announcement Modal (Mock UI for Teachers) */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
                <h2 className="text-xl font-bold text-slate-900">Buat Pengumuman Baru</h2>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Judul Pengumuman</label>
                  <input type="text" placeholder="Contoh: Libur Nasional Idul Fitri" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-slate-700">Isi Pengumuman</label>
                  <textarea rows={5} placeholder="Tuliskan detail pengumuman di sini..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Target Penerima</label>
                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                      <option>Semua Warga Sekolah</option>
                      <option>Hanya Siswa</option>
                      <option>Hanya Guru</option>
                      <option>Kelas 12 Saja</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Prioritas</label>
                    <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium">
                      <option>Normal</option>
                      <option>Tinggi (Darurat)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-6">
                  <label className="text-sm font-bold text-slate-700">Pengaturan Tambahan</label>
                  
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Sematkan di Atas (Pin)</p>
                      <p className="text-xs text-slate-500">Pengumuman akan selalu muncul di urutan pertama.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Izinkan Komentar</p>
                      <p className="text-xs text-slate-500">Siswa dan orang tua dapat bertanya di kolom komentar.</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Wajib Konfirmasi (RSVP)</p>
                      <p className="text-xs text-slate-500">Penerima harus menekan tombol "Saya Mengerti".</p>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                    <input type="checkbox" className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" defaultChecked />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">Kirim Notifikasi Push & Email</p>
                      <p className="text-xs text-slate-500">Kirim peringatan instan ke perangkat penerima.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 shrink-0 flex items-center justify-between bg-slate-50">
                <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-sm px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors">
                  <Paperclip className="w-4 h-4" /> Tambah Lampiran
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-sm shadow-blue-200 flex items-center gap-2">
                    <Send className="w-4 h-4" /> Terbitkan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

