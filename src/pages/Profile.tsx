import { useState, useRef } from "react";
import {
  UserCircle, Mail, Award, Flame, Star, Trophy, Settings, Edit3,
  BookOpen, Clock, GraduationCap, ShieldCheck, FileText, MessageSquare,
  BarChart3, Users, Calendar, Lock, Smartphone, RefreshCw, PenTool,
  CheckCircle, AlertCircle, Eye, EyeOff, Upload, Trash2, Video, Presentation, Play
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useAuth } from "@/src/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { gamificationService, type UserStreak, type UserBadge } from "../services/gamificationService";

const MOCK_STREAK: UserStreak = {
  user_id: 'demo-user',
  tenant_id: 'demo-tenant',
  current_streak: 5,
  longest_streak: 12,
  last_activity_date: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const MOCK_BADGES: UserBadge[] = [
  {
    badge_id: 'b1',
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    badge: { id: 'b1', name: 'First Quiz', description: 'Menyelesaikan kuis pertama Anda', icon: '📝', created_at: '' }
  },
  {
    badge_id: 'b2',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    badge: { id: 'b2', name: 'Perfect Score', description: 'Mendapat nilai 100 di kuis', icon: '💯', created_at: '' }
  },
  {
    badge_id: 'b3',
    created_at: new Date().toISOString(),
    badge: { id: 'b3', name: 'LMS Voyager', description: 'Menjelajahi semua modul pembelajaran', icon: '🚀', created_at: '' }
  }
];

export function Profile() {
  const { user, tenantId, role, profile } = useAuth();
  const navigate = useNavigate();
  const isTeacher = role === 'teacher';

  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'preferences' | 'private_notes'>('overview');
  const [showPassword, setShowPassword] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState<string | null>("https://upload.wikimedia.org/wikipedia/commons/f/f8/John_Hancock_signature.png");
  const [openSessionMenuId, setOpenSessionMenuId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [streakData, setStreakData] = useState<UserStreak | null>(null);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loadingGamification, setLoadingGamification] = useState(true);


  useEffect(() => {
    if (!isTeacher) {
      loadGamificationData();
    }
  }, [user, tenantId, isTeacher]);

  const loadGamificationData = async () => {
    try {
      setLoadingGamification(true);

      // Fallback to mock data if user/tenant is missing
      const canFetch = user && tenantId;

      if (!canFetch) {
        setStreakData(MOCK_STREAK);
        setUserBadges(MOCK_BADGES);
        setLoadingGamification(false);
        return;
      }

      const [streak, badges] = await Promise.all([
        gamificationService.getUserStreak(user.id, tenantId),
        gamificationService.getUserBadges(user.id, tenantId)
      ]);
      setStreakData(streak);
      setUserBadges(badges);
    } catch (error: any) {
      // PGRST204/205: Missing table/schema cache error
      // 42703: Column does not exist
      const isMissingSchema = ['PGRST204', 'PGRST205', '42703'].includes(error?.code);

      if (isMissingSchema) {
        console.warn(`[Diagnostic] Supabase Schema Missing (Code: ${error?.code}). Gamification tables not found. Falling back to mock data.`);
        setStreakData(MOCK_STREAK);
        setUserBadges(MOCK_BADGES);
      } else {
        console.error("Failed to load gamification data:", error);
        setStreakData(null);
        setUserBadges([]);
      }
    } finally {
      setLoadingGamification(false);
    }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatureUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSignature = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSignatureUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };



  // --- Mock Data ---
  const studentData = {
    name: "Budi Santoso",
    email: "budi.s@student.edusync.com",
    nisn: "0051234567",
    class: "12 IPA 1",
    status: "Siswa Kelas 12",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Budi",
    joinedDate: "Agustus 2023",
    bio: "Siswa kelas 12 yang tertarik dengan pemrograman dan fisika kuantum. Bercita-cita menjadi Software Engineer.",
    stats: {
      tasksCompleted: 42,
      certificates: 3,
      reputation: 1250,
      averageScore: 88,
    },
    learningProgress: [
      { subject: "Matematika Lanjut", progress: 75, color: "bg-blue-500" },
      { subject: "Fisika Kuantum", progress: 40, color: "bg-purple-500" },
      { subject: "Pemrograman Web", progress: 90, color: "bg-emerald-500" },
    ],
    recentActivities: [
      { id: 1, title: "Menyelesaikan Kuis Matematika", time: "2 jam yang lalu", type: "quiz", score: 90 },
      { id: 2, title: "Membaca Materi Fisika Dasar", time: "5 jam yang lalu", type: "read", score: null },
      { id: 3, title: "Menjawab pertanyaan di Forum", time: "1 hari yang lalu", type: "forum", score: null },
    ],
    privateNotes: [
      { id: 1, date: "01 Mar 2026", author: "Pak Budi (Wali Kelas)", content: "Budi menunjukkan peningkatan signifikan di mata pelajaran Fisika. Terus pertahankan!" },
      { id: 2, date: "15 Feb 2026", author: "Bu Ani (Guru BK)", content: "Telah melakukan sesi konseling karir. Budi tertarik masuk jurusan Ilmu Komputer UI." }
    ]
  };

  const teacherData = {
    name: "Dr. Alan Turing, M.Kom",
    email: "alan.turing@teacher.edusync.com",
    nip: "198005122005011003",
    subjects: ["Matematika Lanjut", "Ilmu Komputer"],
    status: "Guru Besar Ilmu Komputer",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alan",
    joinedDate: "Juli 2020",
    bio: "Pengajar Ilmu Komputer dengan pengalaman 10+ tahun di industri perangkat lunak. Fokus pada AI dan Algoritma.",
    stats: {
      activeClasses: 4,
      totalStudents: 128,
      tasksToGrade: 15,
      forumActivity: "Tinggi",
    },
    activeClassesList: [
      { id: 1, name: "12 IPA 1", subject: "Ilmu Komputer", students: 32, schedule: "Senin, 08:00 - 10:00", room: "Lab Komputer 1" },
      { id: 2, name: "12 IPA 2", subject: "Ilmu Komputer", students: 30, schedule: "Selasa, 10:00 - 12:00", room: "Lab Komputer 2" },
      { id: 3, name: "11 MIPA 1", subject: "Matematika Lanjut", students: 35, schedule: "Rabu, 08:00 - 10:00", room: "R. 301" },
      { id: 4, name: "10 IPS 3", subject: "TIK Dasar", students: 31, schedule: "Kamis, 13:00 - 14:30", room: "Lab Komputer 1" },
    ],
    officeHours: "Senin & Rabu, 13:00 - 15:00 WIB (Ruang Guru Lt. 2)",
  };

  const currentUser = isTeacher ? teacherData : studentData;

  // --- Shared Components ---
  const SecurityTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" />
          Keamanan Akun
        </h2>

        <div className="space-y-6">
          {/* Change Password */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Ubah Kata Sandi</h3>
            <div className="space-y-3 max-w-md">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Kata Sandi Saat Ini"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <input
                type="password"
                placeholder="Kata Sandi Baru"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="password"
                placeholder="Konfirmasi Kata Sandi Baru"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-colors">
                Perbarui Kata Sandi
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* 2FA */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-slate-500" />
                Autentikasi Dua Faktor (2FA)
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                Tambahkan lapisan keamanan ekstra ke akun Anda. Saat login, Anda harus memasukkan kode dari aplikasi authenticator.
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-bold rounded-xl transition-colors whitespace-nowrap">
              Aktifkan 2FA
            </button>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Login History */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Riwayat Login Terakhir</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <div className="text-sm font-bold text-slate-900">MacBook Pro - Chrome</div>
                  <div className="text-xs text-slate-500">Jakarta, Indonesia • IP: 114.122.xx.xx</div>
                </div>
                <div className="text-xs font-bold text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Saat ini
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-xl border border-slate-100">
                <div>
                  <div className="text-sm font-bold text-slate-900">iPhone 13 - Safari</div>
                  <div className="text-xs text-slate-500">Jakarta, Indonesia • IP: 114.122.xx.xx</div>
                </div>
                <div className="text-xs text-slate-400">Kemarin, 14:30</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const PreferencesTab = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          Preferensi Belajar & Notifikasi
        </h2>

        <div className="space-y-6">
          {/* Theme */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Tema Aplikasi</h3>
            <div className="flex gap-3">
              <button className="flex-1 py-3 border-2 border-blue-600 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full bg-white border border-blue-200"></div>
                Light Mode
              </button>
              <button className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <div className="w-4 h-4 rounded-full bg-slate-800"></div>
                Dark Mode
              </button>
              <button className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors">
                <Smartphone className="w-4 h-4" />
                Sistem
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Notifications */}
          <div>
            <h3 className="text-sm font-bold text-slate-700 mb-3">Pengaturan Notifikasi</h3>
            <div className="space-y-3">
              {[
                { label: "Tugas Baru & Tenggat Waktu", desc: "Pemberitahuan saat ada tugas baru atau H-1 tenggat waktu.", email: true, wa: true },
                { label: "Nilai & Feedback", desc: "Pemberitahuan saat guru memberikan nilai atau komentar.", email: true, wa: false },
                { label: "Aktivitas Ruang Diskusi", desc: "Pemberitahuan saat ada balasan di pertanyaan Anda.", email: false, wa: false },
                { label: "Pengumuman Sekolah", desc: "Informasi penting dari admin atau sekolah.", email: true, wa: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{item.label}</div>
                    <div className="text-xs text-slate-500">{item.desc}</div>
                  </div>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked={item.email} className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500" />
                      <span className="text-xs font-medium text-slate-600">Email</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" defaultChecked={item.wa} className="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500" />
                      <span className="text-xs font-medium text-slate-600">WhatsApp</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 pb-24 md:pb-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Profil Pengguna</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Column: Identity Card */}
        <div className="w-full lg:w-1/3 space-y-6 shrink-0">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col items-center text-center relative overflow-hidden">
            <div className={cn(
              "absolute top-0 left-0 w-full h-24",
              isTeacher ? "bg-gradient-to-r from-emerald-500 to-teal-600" : "bg-gradient-to-r from-blue-500 to-indigo-600"
            )}></div>

            <div className="relative mt-8 mb-4">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-md">
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full rounded-full bg-slate-100 object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-slate-900">{currentUser.name}</h2>
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                isTeacher ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                {currentUser.status}
              </span>
              {isTeacher && <span title="Verified Teacher"><ShieldCheck className="w-4 h-4 text-emerald-500" /></span>}
              {!isTeacher && streakData && streakData.current_streak > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  {streakData.current_streak} Hari
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 text-slate-500 text-sm mt-2">
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> {currentUser.email}
              </div>
              <div className="flex items-center justify-center gap-2">
                <FileText className="w-4 h-4" /> {isTeacher ? `NIP: ${teacherData.nip}` : `NISN: ${studentData.nisn}`}
              </div>
              <div className="flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> {isTeacher ? teacherData.subjects.join(', ') : `Kelas: ${studentData.class}`}
              </div>
            </div>

            <div className="w-full h-px bg-slate-100 my-5"></div>

            <div className="text-left w-full">
              <h3 className="text-xs font-bold text-slate-500 uppercase mb-2">Bio / Tentang Saya</h3>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">
                {currentUser.bio}
              </p>
              <button
                onClick={() => navigate(`/p/${isTeacher ? 'alan-turing' : 'budi-santoso'}`)}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> Lihat Profil Publik
              </button>
            </div>

            <div className="w-full h-px bg-slate-100 my-5"></div>

            {/* GCR Sync Status */}
            <div className="w-full flex items-center justify-between p-3 bg-green-50 border border-green-100 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/5/59/Google_Classroom_Logo.png" alt="GCR" className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-900">Google Classroom</div>
                  <div className="text-[10px] text-green-600 font-bold">Tersinkronisasi</div>
                </div>
              </div>
              <button className="text-xs font-bold text-slate-500 hover:text-slate-700">Putuskan</button>
            </div>
          </div>

          {/* Navigation Tabs (Mobile: Horizontal scroll, Desktop: Vertical list) */}
          <div className="bg-white rounded-3xl p-2 border border-slate-200 shadow-sm flex flex-row lg:flex-col overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveTab('overview')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors whitespace-nowrap",
                activeTab === 'overview' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <BarChart3 className="w-4 h-4" /> Dasbor Utama
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors whitespace-nowrap",
                activeTab === 'security' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Lock className="w-4 h-4" /> Keamanan Akun
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors whitespace-nowrap",
                activeTab === 'preferences' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Settings className="w-4 h-4" /> Preferensi
            </button>
            {!isTeacher && (
              <button
                onClick={() => setActiveTab('private_notes')}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-colors whitespace-nowrap",
                  activeTab === 'private_notes' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                )}
              >
                <PenTool className="w-4 h-4" /> Private Notes
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Main Content Area */}
        <div className="w-full lg:w-2/3">
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'preferences' && <PreferencesTab />}

          {/* Private Notes Tab (Student Only) */}
          {!isTeacher && activeTab === 'private_notes' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-amber-50 rounded-3xl p-6 border border-amber-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10">
                  <Lock className="w-32 h-32 text-amber-900" />
                </div>
                <div className="relative z-10">
                  <h2 className="text-lg font-bold text-amber-900 mb-2 flex items-center gap-2">
                    <PenTool className="w-5 h-5" />
                    Catatan Bimbingan (Private Notes)
                  </h2>
                  <p className="text-sm text-amber-700/80 mb-6 max-w-lg">
                    Catatan ini bersifat rahasia dan hanya dapat dilihat oleh Anda dan guru/konselor yang bersangkutan.
                  </p>

                  <div className="space-y-4">
                    {studentData.privateNotes.map(note => (
                      <div key={note.id} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-slate-900 text-sm">{note.author}</div>
                          <div className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{note.date}</div>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

              {/* --- TEACHER OVERVIEW --- */}
              {isTeacher ? (
                <>
                  {/* Teacher Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{teacherData.stats.activeClasses}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Kelas Aktif</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <GraduationCap className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{teacherData.stats.totalStudents}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Total Siswa</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center relative">
                        <FileText className="w-5 h-5" />
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{teacherData.stats.tasksToGrade}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Perlu Dinilai</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xl font-black text-slate-900">{teacherData.stats.forumActivity}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Aktivitas Forum</p>
                      </div>
                    </div>
                  </div>

                  {/* Active Classes & Schedule Flow */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-600" />
                        Jadwal & Manajemen Kelas
                      </h2>
                      <button className="text-sm font-bold text-emerald-600 hover:text-emerald-700">Lihat Kalender Lengkap</button>
                    </div>

                    <div className="relative">
                      {/* Vertical Line for Flow */}
                      <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-100 hidden sm:block"></div>

                      <div className="space-y-4">
                        {teacherData.activeClassesList.map((cls, index) => (
                          <div key={cls.id} className="relative flex flex-col sm:flex-row gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group">

                            {/* Time/Schedule Indicator */}
                            <div className="hidden sm:flex flex-col items-center gap-2 min-w-[60px] pt-1 z-10">
                              <div className={cn(
                                "w-4 h-4 rounded-full border-2 bg-white",
                                index === 0 ? "border-emerald-500" : "border-slate-300"
                              )}></div>
                              {index === 0 && <div className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">NEXT</div>}
                            </div>

                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-slate-900 text-lg">{cls.name}</h3>
                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-md border border-slate-200">
                                      {cls.subject}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                                    <span className="flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5" /> {cls.schedule}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5" /> {cls.students} Siswa
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold border border-slate-200">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                    {cls.room}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-50 relative">
                                <div className="relative flex-1">
                                  <button
                                    onClick={() => setOpenSessionMenuId(openSessionMenuId === cls.id ? null : cls.id)}
                                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                                  >
                                    <Play className="w-3.5 h-3.5 fill-current" />
                                    Mulai Sesi
                                  </button>

                                  <AnimatePresence>
                                    {openSessionMenuId === cls.id && (
                                      <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-20 overflow-hidden"
                                      >
                                        <button
                                          onClick={() => {
                                            alert(`Membuat link meeting untuk ${cls.name}...`);
                                            setOpenSessionMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                          <Video className="w-3.5 h-3.5" />
                                          Buat Link Meeting
                                        </button>
                                        <button
                                          onClick={() => {
                                            alert(`Membuka mode presentasi untuk ${cls.name}...`);
                                            setOpenSessionMenuId(null);
                                          }}
                                          className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-600 rounded-lg flex items-center gap-2 transition-colors"
                                        >
                                          <Presentation className="w-3.5 h-3.5" />
                                          Buka Mode Presentasi
                                        </button>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                                <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                                  Absensi
                                </button>
                                <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors">
                                  Nilai
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Signature Manager & Office Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <PenTool className="w-5 h-5 text-blue-600" />
                          Tanda Tangan Digital
                        </h2>
                        {signatureUrl && (
                          <button
                            onClick={removeSignature}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus Tanda Tangan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mb-4">Digunakan untuk penerbitan sertifikat otomatis.</p>

                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg"
                        className="hidden"
                        onChange={handleSignatureUpload}
                      />

                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                          "w-full h-32 border-2 border-dashed rounded-2xl flex items-center justify-center mb-4 relative group cursor-pointer transition-colors overflow-hidden",
                          signatureUrl ? "bg-slate-50 border-slate-200 hover:bg-slate-100" : "bg-blue-50 border-blue-200 hover:bg-blue-100"
                        )}
                      >
                        {signatureUrl ? (
                          <>
                            <img src={signatureUrl} alt="Signature" className="h-16 object-contain opacity-80" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <span className="text-white text-sm font-bold flex items-center gap-2">
                                <Upload className="w-4 h-4" /> Ubah Tanda Tangan
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-blue-600">
                            <Upload className="w-6 h-6" />
                            <span className="text-sm font-bold">Unggah Tanda Tangan</span>
                            <span className="text-xs font-medium opacity-70">PNG atau JPG, max 2MB</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                      <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-amber-600" />
                        Office Hours
                      </h2>
                      <p className="text-xs text-slate-500 mb-4">Waktu ketersediaan untuk konsultasi siswa.</p>
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                        <p className="text-sm font-medium text-amber-900">{teacherData.officeHours}</p>
                      </div>
                      <button className="mt-4 w-full py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl transition-colors">
                        Edit Jadwal
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* --- STUDENT OVERVIEW --- */
                <>
                  {/* Student Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{studentData.stats.tasksCompleted}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Tugas Selesai</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{studentData.stats.certificates}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Sertifikat</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                        <Star className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{studentData.stats.reputation}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Reputasi Forum</p>
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900">{studentData.stats.averageScore}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">Rata-rata Nilai</p>
                      </div>
                    </div>
                  </div>

                  {/* Learning Progress Tracker */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      Learning Progress Tracker
                    </h2>
                    <div className="space-y-5">
                      {studentData.learningProgress.map((item, i) => (
                        <div key={i}>
                          <div className="flex justify-between items-end mb-2">
                            <span className="text-sm font-bold text-slate-700">{item.subject}</span>
                            <span className="text-xs font-bold text-slate-500">{item.progress}%</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.progress}%` }}
                              transition={{ duration: 1, delay: i * 0.2 }}
                              className={cn("h-full rounded-full", item.color)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Aktivitas Terakhir
                      </h2>
                      <button className="text-sm font-bold text-blue-600 hover:text-blue-700">Riwayat Lengkap</button>
                    </div>
                    <div className="space-y-3">
                      {studentData.recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                              activity.type === 'quiz' ? "bg-emerald-100 text-emerald-600" :
                                activity.type === 'read' ? "bg-blue-100 text-blue-600" :
                                  "bg-purple-100 text-purple-600"
                            )}>
                              {activity.type === 'quiz' ? <CheckCircle className="w-5 h-5" /> :
                                activity.type === 'read' ? <BookOpen className="w-5 h-5" /> :
                                  <MessageSquare className="w-5 h-5" />}
                            </div>
                            <div>
                              <h3 className="font-bold text-slate-900 text-sm">{activity.title}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">{activity.time}</p>
                            </div>
                          </div>
                          {activity.score !== null && (
                            <div className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-lg text-sm border border-emerald-100">
                              {activity.score}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Badges Section */}
                  {!isTeacher && (
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          Lencana & Pencapaian
                        </h2>
                        <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                          {userBadges.length} Didapat
                        </span>
                      </div>

                      {loadingGamification ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 text-slate-300 animate-spin" />
                        </div>
                      ) : userBadges.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {userBadges.map((ub) => (
                            <motion.div
                              key={ub.badge_id}
                              whileHover={{ y: -5 }}
                              className="flex flex-col items-center p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center group transition-all hover:bg-white hover:border-yellow-200 hover:shadow-md"
                            >
                              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                                {ub.badge.icon || '🏅'}
                              </div>
                              <h3 className="text-xs font-bold text-slate-900 mb-1">{ub.badge.name}</h3>
                              <p className="text-[10px] text-slate-500 leading-tight">
                                {ub.badge.description}
                              </p>
                              <div className="mt-2 text-[9px] font-bold text-slate-400">
                                {new Date(ub.created_at).toLocaleDateString()}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                          <Award className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                          <p className="text-sm font-medium text-slate-500 italic">Belum ada lencana yang didapat. Ayo tingkatkan belajarmu!</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
