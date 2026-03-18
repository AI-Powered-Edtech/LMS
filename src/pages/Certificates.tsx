import { useState, useRef } from "react";
import { 
  Award, Download, Search, Filter, Calendar as CalendarIcon, 
  CheckCircle, Share2, QrCode, Link as LinkIcon, ShieldCheck, 
  Image as ImageIcon, FileText, Linkedin, Instagram, MessageCircle,
  Plus, Users, LayoutTemplate, Settings, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/utils/cn";
import { useAuth } from "@/src/contexts/AuthContext";
// html2canvas and jsPDF loaded dynamically in handleDownload to reduce bundle (~450KB saving)

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  date: string;
  grade: string;
  category: "Kelulusan" | "Penyelesaian Materi" | "Penghargaan Komunitas";
  image: string;
  isHighlighted?: boolean;
  certificateId: string;
  signatureUrl: string;
}

const certificates: Certificate[] = [
  {
    id: "1",
    title: "Kelulusan Bootcamp AI & Machine Learning",
    issuer: "EduSync Academy & Google",
    date: "15 Okt 2026",
    grade: "A+ (Cum Laude)",
    category: "Kelulusan",
    image: "https://images.unsplash.com/photo-1589330694653-ded6df03f754?auto=format&fit=crop&q=80&w=800",
    isHighlighted: true,
    certificateId: "CERT-2026-AI-9823",
    signatureUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f8/John_Hancock_signature.png"
  },
  {
    id: "2",
    title: "Penyelesaian Modul: Neural Networks",
    issuer: "EduSync Smart Player",
    date: "02 Sep 2026",
    grade: "100%",
    category: "Penyelesaian Materi",
    image: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&q=80&w=800",
    certificateId: "CERT-MOD-NN-4412",
    signatureUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f8/John_Hancock_signature.png"
  },
  {
    id: "3",
    title: "Top Kontributor Ruang Diskusi",
    issuer: "EduSync Community",
    date: "20 Agu 2026",
    grade: "Master Rank",
    category: "Penghargaan Komunitas",
    image: "https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&q=80&w=800",
    certificateId: "CERT-COM-TOP-1102",
    signatureUrl: "https://upload.wikimedia.org/wikipedia/commons/f/f8/John_Hancock_signature.png"
  },
];

const CATEGORIES = ["Semua", "Kelulusan", "Penyelesaian Materi", "Penghargaan Komunitas"];

export function Certificates() {
  const { role } = useAuth();
  const isTeacher = role === 'teacher';
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState<string | null>(null);

  const certificateRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const filteredCertificates = certificates.filter((cert) => {
    const matchesSearch = cert.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || cert.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const highlightedCert = certificates.find(c => c.isHighlighted);

  const handleDownload = async (cert: Certificate, format: 'pdf' | 'png') => {
    setIsDownloading(cert.id);
    const element = certificateRefs.current[cert.id];
    
    if (!element) {
      setIsDownloading(null);
      return;
    }

    try {
      // Dynamic imports — only loaded when user clicks download
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      // Temporarily make the hidden certificate visible for capturing
      element.style.display = 'block';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      element.style.display = 'none';

      if (format === 'png') {
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `${cert.title.replace(/\s+/g, '_')}_Certificate.png`;
        link.click();
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'px',
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
        pdf.save(`${cert.title.replace(/\s+/g, '_')}_Certificate.pdf`);
      }
    } catch (error) {
      console.error("Error generating certificate:", error);
      alert("Gagal mengunduh sertifikat. Silakan coba lagi.");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleShare = (platform: string, cert: Certificate) => {
    const text = `Saya baru saja mendapatkan sertifikat "${cert.title}" dari ${cert.issuer}! Lihat portofolio saya di EduSync.`;
    const url = `https://edusync.app/verify/${cert.certificateId}`;
    
    let shareUrl = '';
    if (platform === 'linkedin') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
    } else if (platform === 'whatsapp') {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`;
    } else if (platform === 'twitter') {
      shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank');
    }
    setShowShareMenu(null);
  };

  // --- Teacher View ---
  if (isTeacher) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Manajemen Sertifikat
            </h1>
            <p className="text-slate-500 mt-2">
              Desain template dan terbitkan sertifikat untuk siswa Anda.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold flex items-center gap-2 transition-colors">
              <Settings className="w-4 h-4" /> Pengaturan
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> Buat Template Baru
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Template Builder Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <LayoutTemplate className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Template Builder</h2>
            <p className="text-slate-500 text-sm mb-6">
              Desain layout sertifikat dengan fitur drag-and-drop. Atur posisi logo, teks dinamis (Nama, Nilai), dan tanda tangan digital.
            </p>
            <button className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-indigo-200">
              Buka Editor Visual
            </button>
          </div>

          {/* Bulk Issuance Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Penerbitan Massal (Bulk Issuance)</h2>
            <p className="text-slate-500 text-sm mb-6">
              Terbitkan sertifikat secara otomatis untuk seluruh siswa dalam satu kelas yang telah memenuhi KKM atau menyelesaikan modul.
            </p>
            <button className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-emerald-200">
              Pilih Kelas & Terbitkan
            </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Riwayat Penerbitan Terakhir</h2>
            <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Semua</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-sm text-slate-500">
                  <th className="p-4 font-medium">Nama Sertifikat</th>
                  <th className="p-4 font-medium">Penerima</th>
                  <th className="p-4 font-medium">Tanggal</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-4 font-medium text-slate-900">Kelulusan AI Basics</td>
                  <td className="p-4 text-slate-600">Kelas 12 IPA 1 (32 Siswa)</td>
                  <td className="p-4 text-slate-600">04 Mar 2026</td>
                  <td className="p-4"><span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-xs">Berhasil</span></td>
                </tr>
                <tr className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="p-4 font-medium text-slate-900">Penyelesaian Modul Fisika</td>
                  <td className="p-4 text-slate-600">Budi Santoso</td>
                  <td className="p-4 text-slate-600">03 Mar 2026</td>
                  <td className="p-4"><span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-xs">Berhasil</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // --- Student View ---
  return (
    <div className="max-w-6xl mx-auto space-y-8 p-4 md:p-8">
      {/* Header & Public Profile Link */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Sertifikat Saya
          </h1>
          <p className="text-slate-500 mt-2">
            Portofolio digital yang memvalidasi pencapaian akademik dan komunitas Anda.
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-0.5">Profil Publik</div>
            <a href="#/p/budi-santoso" className="text-sm font-medium text-blue-600 hover:underline truncate max-w-[200px] block">
              edusync.app/p/budi-santoso
            </a>
          </div>
          <button className="ml-2 p-2 bg-white text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200 transition-colors" title="Salin Tautan">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress to Next Certificate */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
          <Award className="w-8 h-8" />
        </div>
        <div className="flex-1 w-full">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="font-bold text-slate-900">Progress Menuju Sertifikat Berikutnya</h3>
              <p className="text-sm text-slate-500">Modul: Pengantar Data Science</p>
            </div>
            <span className="font-black text-amber-600 text-xl">85%</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }} animate={{ width: '85%' }} transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-amber-500 rounded-full"
            />
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" /> Selesaikan 1 kuis lagi untuk mendapatkan sertifikat otomatis.
          </p>
        </div>
        <button className="w-full md:w-auto px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-colors whitespace-nowrap">
          Lanjutkan Belajar
        </button>
      </div>

      {/* Highlighted Certificate */}
      {highlightedCert && (
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white shadow-xl">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-400 via-transparent to-transparent"></div>
          <div className="p-8 md:p-10 flex flex-col md:flex-row gap-8 relative z-10">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-400/20 text-yellow-400 rounded-lg text-xs font-bold uppercase tracking-wider mb-4 border border-yellow-400/30">
                <Award className="w-4 h-4" /> Pencapaian Tertinggi
              </div>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                {highlightedCert.title}
              </h2>
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-300">
                  <ShieldCheck className="w-5 h-5 text-blue-400" />
                  <span>Diterbitkan oleh <strong className="text-white">{highlightedCert.issuer}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CalendarIcon className="w-5 h-5 text-blue-400" />
                  <span>Diberikan pada <strong className="text-white">{highlightedCert.date}</strong></span>
                </div>
                <div className="flex items-center gap-3 text-slate-300">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <span>Nilai Akhir: <strong className="text-white">{highlightedCert.grade}</strong></span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <button 
                  onClick={() => handleDownload(highlightedCert, 'pdf')}
                  disabled={isDownloading === highlightedCert.id}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-2 transition-colors disabled:opacity-70"
                >
                  {isDownloading === highlightedCert.id ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FileText className="w-5 h-5" />}
                  Unduh PDF
                </button>
                <button 
                  onClick={() => handleDownload(highlightedCert, 'png')}
                  disabled={isDownloading === highlightedCert.id}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold flex items-center gap-2 transition-colors backdrop-blur-sm disabled:opacity-70"
                >
                  <ImageIcon className="w-5 h-5" />
                  Unduh PNG
                </button>
              </div>
            </div>
            
            <div className="w-full md:w-1/3 shrink-0 flex flex-col items-center justify-center bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur-md">
              <QrCode className="w-32 h-32 text-white opacity-80 mb-4" />
              <div className="text-center">
                <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">ID Sertifikat Resmi</div>
                <div className="font-mono font-bold text-blue-300">{highlightedCert.certificateId}</div>
              </div>
              <p className="text-xs text-slate-400 text-center mt-4">Pindai QR untuk verifikasi keaslian di platform EduSync.</p>
            </div>
          </div>
        </div>
      )}

      {/* Gallery & Filters */}
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-2xl font-bold text-slate-900">Galeri Portofolio</h2>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari sertifikat..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 w-full text-sm shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all",
                    selectedCategory === cat 
                      ? "bg-slate-800 text-white shadow-md" 
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((cert, index) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col"
            >
              <div className="relative h-48 overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={cert.image}
                  alt={cert.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-lg border border-white/30">
                    {cert.category}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-400" />
                    <span className="font-bold text-sm">{cert.grade}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    {cert.date}
                  </div>
                </div>
              </div>
              
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="font-bold text-lg text-slate-900 mb-2 line-clamp-2">
                  {cert.title}
                </h3>
                <p className="text-slate-500 text-sm mb-4 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  {cert.issuer}
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="relative">
                    <button 
                      onClick={() => setShowShareMenu(showShareMenu === cert.id ? null : cert.id)}
                      className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                      title="Bagikan"
                    >
                      <Share2 className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {showShareMenu === cert.id && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-20"
                        >
                          <div className="p-2 space-y-1">
                            <button onClick={() => handleShare('linkedin', cert)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors">
                              <Linkedin className="w-4 h-4" /> LinkedIn
                            </button>
                            <button onClick={() => handleShare('whatsapp', cert)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-green-50 hover:text-green-700 rounded-xl transition-colors">
                              <MessageCircle className="w-4 h-4" /> WhatsApp
                            </button>
                            <button onClick={() => handleShare('twitter', cert)} className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-sky-50 hover:text-sky-700 rounded-xl transition-colors">
                              <Share2 className="w-4 h-4" /> Twitter / X
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleDownload(cert, 'png')}
                      disabled={isDownloading === cert.id}
                      className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors border border-transparent hover:border-blue-100"
                      title="Unduh PNG"
                    >
                      <ImageIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDownload(cert, 'pdf')}
                      disabled={isDownloading === cert.id}
                      className="px-4 py-2.5 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors border border-slate-200 hover:border-blue-200"
                    >
                      {isDownloading === cert.id ? <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" /> : <Download className="w-4 h-4" />}
                      PDF
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden Certificate Template for html2canvas */}
              <div 
                ref={el => { certificateRefs.current[cert.id] = el; }}
                className="absolute top-0 left-0 w-[800px] h-[600px] bg-white -z-50"
                style={{ display: 'none' }}
              >
                {/* Certificate Design */}
                <div className="w-full h-full p-8 relative overflow-hidden bg-slate-50">
                  <div className="absolute inset-0 border-[16px] border-double border-slate-200 m-4 rounded-xl"></div>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-12">
                    <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mb-6 shadow-lg">
                      <Award className="w-8 h-8" />
                    </div>
                    
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight uppercase">Sertifikat Pencapaian</h1>
                    <p className="text-lg text-slate-500 mb-8 font-medium">Diberikan dengan bangga kepada</p>
                    
                    <h2 className="text-5xl font-serif italic text-blue-900 mb-8 border-b-2 border-blue-200 pb-4 px-12">
                      Budi Santoso
                    </h2>
                    
                    <p className="text-slate-600 text-lg mb-2">Atas keberhasilannya menyelesaikan:</p>
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 max-w-2xl">{cert.title}</h3>
                    
                    <div className="flex items-center justify-between w-full mt-12 px-12">
                      <div className="text-left">
                        <div className="text-sm text-slate-500 mb-1">Diterbitkan oleh</div>
                        <div className="font-bold text-slate-800">{cert.issuer}</div>
                        <div className="text-sm text-slate-500 mt-1">Tanggal: {cert.date}</div>
                      </div>
                      
                      <div className="flex flex-col items-center">
                        <img src={cert.signatureUrl} alt="Signature" className="h-16 object-contain mb-2 opacity-80" crossOrigin="anonymous" />
                        <div className="w-48 border-t border-slate-300"></div>
                        <div className="text-sm font-bold text-slate-800 mt-2">Dr. Alan Turing</div>
                        <div className="text-xs text-slate-500">Direktur Akademik</div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end">
                        <QrCode className="w-20 h-20 text-slate-800 mb-2" />
                        <div className="text-[10px] text-slate-400 font-mono">ID: {cert.certificateId}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredCertificates.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
            <Award className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-700 mb-2">Tidak ada sertifikat</h3>
            <p className="text-slate-500">
              Sertifikat yang Anda cari tidak ditemukan dalam kategori ini.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
