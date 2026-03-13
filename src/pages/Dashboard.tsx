import { useState, useRef } from "react";
import {
  Lock,
  Star,
  Crown,
  AlertTriangle,
  Play,
  Sparkles,
  HeartCrack,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Target,
  Trophy,
  Activity,
  Zap,
  Shield,
  Eye,
  Bell,
  User,
  Users,
  BookOpen,
  Megaphone,
  Plus,
  Loader2,
  X
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion, AnimatePresence } from "motion/react";
import { useEffect } from "react";
import { courseService, Course } from "@/src/services/courseService";
import { useTenant } from "@/src/contexts/TenantContext";

import { Link, useNavigate, useLocation } from "react-router-dom";
import { navigationItems } from "@/src/config/navigation";
import { HubView } from "@/src/components/HubView";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStudentProgress } from "@/src/contexts/StudentProgressContext";
import { useAssignments } from "@/src/features/assignments/hooks/useAssignments";
import { useClassroom } from "@/src/contexts/ClassroomContext";

export function Dashboard() {
  console.log('[Dashboard] Rendering started');
  const { role } = useAuth();
  const { xp, dailyGoal, achievements, addXP } = useStudentProgress();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { classrooms, joinClassroom } = useClassroom();
  
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);

  const [isClaiming, setIsClaiming] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { tenant } = useTenant();
  const impersonatedStudent = location.state?.impersonateStudent;

  const [activeCourses, setActiveCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  useEffect(() => {
    if (role === 'student' && tenant?.id) {
      loadActiveCourses();
    }
  }, [role, tenant?.id]);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const joinCode = searchParams.get('join');
    if (joinCode && role === 'student') {
      setJoinCodeInput(joinCode.toUpperCase());
      setShowJoinModal(true);
      // Remove the parameter from URL after reading it
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location, role]);

  const loadActiveCourses = async () => {
    if (!tenant?.id) return;
    try {
      setLoadingCourses(true);
      const { courses } = await courseService.fetchCourses({
        tenantId: tenant.id,
        limit: 4
      });
      setActiveCourses(courses);
    } catch (err) {
      console.error('Failed to load active courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleJoinClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    
    setIsJoining(true);
    setJoinError(null);
    try {
      await joinClassroom(joinCodeInput.trim());
      setJoinSuccess(true);
      setTimeout(() => {
        setShowJoinModal(false);
        setJoinCodeInput('');
        setJoinSuccess(false);
      }, 2000);
    } catch (err: any) {
      setJoinError(err.message || 'Gagal bergabung ke kelas');
    } finally {
      setIsJoining(false);
    }
  };

  const hubItems = navigationItems.filter(item =>
    item.location === 'learning-hub' && item.roles.includes(role)
  );

  const userName = impersonatedStudent ? impersonatedStudent.name : (role === 'teacher' ? 'Bapak/Ibu Guru' : 'Siswa');

  const handleClaimReward = () => {
    if (isClaiming) return;
    setIsClaiming(true);

    // Simulate network request with anti-cheat throttling
    setTimeout(() => {
      addXP(10); // Add XP when claiming reward
      setShowBadgeModal(true);
      setIsClaiming(false);
      import("canvas-confetti").then((confettiModule) => {
        const confetti = confettiModule.default || confettiModule;
        (confetti as any)({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.5 },
          colors: ["#fbbf24", "#f59e0b", "#d97706"],
        });
      });
    }, 800);
  };

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 p-4 md:p-8">
      {/* Impersonation Banner */}
      {impersonatedStudent && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-center justify-between text-amber-900 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4" />
            <span>Viewing as <span className="font-bold">{impersonatedStudent.name}</span></span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-3 py-1 bg-white/50 hover:bg-white rounded-lg text-xs font-bold transition-colors border border-amber-200"
          >
            Exit Student View
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header: Selamat Datang */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Selamat Datang, {userName}! 👋</h1>
            <p className="text-sm sm:text-base text-slate-500 mt-1">Siap untuk melanjutkan petualangan belajarmu hari ini?</p>
          </div>
        </div>

        {/* Kelas Saya Section (Student Only) */}
        {role === 'student' && (
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Kelas Saya
              </h2>
              <button 
                onClick={() => setShowJoinModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                Gabung Kelas
              </button>
            </div>
            
            {classrooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map(cls => (
                  <div key={cls.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50 hover:border-indigo-200 transition-colors">
                    <h3 className="font-bold text-slate-800">{cls.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                       <User className="w-3.5 h-3.5" />
                       {cls.teacher_name || 'Guru'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-sm font-medium text-slate-500 mb-2">Kamu belum bergabung di kelas mana pun.</p>
                <button 
                  onClick={() => setShowJoinModal(true)}
                  className="text-indigo-600 font-bold text-sm hover:underline"
                >
                  Masukkan Kode Kelas
                </button>
              </div>
            )}
          </div>
        )}

        {/* Top Grid: Jadwal & Tugas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jadwal Hari Ini */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-500" />
                Jadwal Hari Ini
              </h2>
              <Link to="/schedule" className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Semua</Link>
            </div>
            <div className="space-y-4 flex-1">
              {[
                { time: '07:00 - 08:30', subject: 'Matematika', room: 'Ruang 101', active: false },
                { time: '09:00 - 10:30', subject: 'Fisika', room: 'Lab Fisika', active: true },
                { time: '11:00 - 12:30', subject: 'Biologi', room: 'Ruang 102', active: false },
              ].map((schedule, idx) => (
                <div key={idx} className={cn("flex items-start gap-4 p-3 rounded-2xl transition-colors", schedule.active ? "bg-blue-50 border border-blue-100" : "hover:bg-slate-50")}>
                  <div className={cn("w-16 text-right shrink-0 pt-1", schedule.active ? "text-blue-600 font-bold" : "text-slate-500 font-medium")}>
                    <div className="text-sm">{schedule.time.split(' - ')[0]}</div>
                    <div className="text-xs opacity-70">{schedule.time.split(' - ')[1]}</div>
                  </div>
                  <div className={cn("w-1 h-10 rounded-full shrink-0", schedule.active ? "bg-blue-500" : "bg-slate-200")} />
                  <div>
                    <h3 className={cn("font-bold", schedule.active ? "text-blue-900" : "text-slate-700")}>{schedule.subject}</h3>
                    <p className={cn("text-xs mt-0.5", schedule.active ? "text-blue-600" : "text-slate-500")}>{schedule.room}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tugas Mendekati Deadline */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Tugas Mendekati Deadline
              </h2>
              <Link to="/assignments" className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Semua</Link>
            </div>
            <div className="space-y-3 flex-1">
              {assignmentsLoading ? (
                <div className="flex items-center justify-center p-4">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (assignments || []).slice(0, 3).filter(a => a.status === 'assigned' || a.status === 'late').map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate('/assignments')}>
                  <div className={cn("w-3 h-3 rounded-full shrink-0", task.status === 'late' ? "bg-red-500 animate-pulse" : "bg-yellow-400")} />
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1 mb-2">
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">{task.type}</span>
                      <span className={cn("text-xs font-bold", task.status === 'late' ? "text-red-600" : "text-slate-500")}>
                        {new Date(task.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))}
              {!assignmentsLoading && assignments.filter(a => a.status === 'assigned' || a.status === 'late').length === 0 && (
                <div className="text-center p-4 text-slate-500 text-sm">
                  Tidak ada tugas yang mendekati deadline.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Materi Sedang Berjalan (Student Only) */}
        {role === 'student' && activeCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-500" />
                Lanjutkan Belajar
              </h2>
              <Link to="/courses" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Lihat Semua Materi</Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {activeCourses.map((course) => (
                <motion.div
                  key={course.id}
                  whileHover={{ y: -4 }}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="aspect-video rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 flex items-center justify-center overflow-hidden relative">
                    <BookOpen className="w-10 h-10 text-white/50" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </div>
                  <h3 className="font-bold text-slate-900 line-clamp-1 mb-1 group-hover:text-indigo-600 transition-colors">{course.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[10px] font-bold text-slate-400">AKTIF</span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Progress Belajar Minggu Ini */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2 sm:gap-0">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-500" />
              Progress Belajar Minggu Ini
            </h2>
            <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 w-fit">60% Selesai</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-4 mb-3 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: '60%' }} />
          </div>
          <p className="text-sm text-slate-500 font-medium">Anda telah menyelesaikan <strong className="text-slate-800">3 dari 5 modul</strong> yang ditargetkan minggu ini. Teruskan semangatmu!</p>
        </div>

        {/* Bottom Grid: Pengumuman & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pengumuman */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-500" />
                Pengumuman Terbaru
              </h2>
              <Link to="/announcements" className="text-sm font-bold text-blue-600 hover:text-blue-700">Semua</Link>
            </div>
            <div className="space-y-4 flex-1">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">URGENT</span>
                  <span className="text-xs text-red-500 font-medium">Hari ini, 08:00</span>
                </div>
                <h3 className="font-bold text-red-900 mb-1">Libur Nasional Hari Jumat</h3>
                <p className="text-sm text-red-700/80">Sekolah akan diliburkan pada hari Jumat ini. Harap perhatikan penyesuaian jadwal tugas.</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">INFO</span>
                  <span className="text-xs text-slate-500 font-medium">Kemarin, 14:00</span>
                </div>
                <h3 className="font-bold text-slate-800 mb-1">Pendaftaran Ekskul Dibuka</h3>
                <p className="text-sm text-slate-600">Pendaftaran ekstrakurikuler semester genap telah dibuka melalui portal siswa.</p>
              </div>
            </div>
          </div>

          {/* Leaderboard Snapshot */}
          <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Leaderboard Snapshot
              </h2>
              <Link to="/leaderboard" className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Peringkat</Link>
            </div>
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4 sm:p-6 bg-gradient-to-b from-yellow-50 to-white rounded-2xl border border-yellow-100">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-inner border-4 border-white">
                <Crown className="w-10 h-10 text-yellow-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">Rank #12</h3>
              <p className="text-sm font-bold text-green-600 flex items-center justify-center gap-1 mb-4">
                <ArrowRight className="w-4 h-4 -rotate-45" /> Naik 2 peringkat
              </p>
              <div className="w-full max-w-xs bg-slate-100 rounded-full h-2 mb-2">
                <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(xp % 100)}%` }} />
              </div>
              <p className="text-xs text-slate-500 font-medium">Butuh <strong className="text-yellow-600">{100 - (xp % 100)} XP</strong> lagi untuk menyalip Rank #11</p>
            </div>
          </div>
        </div>

        {/* Hub View (Ruang Belajar) */}
        <div className="mt-8 pt-8 border-t border-slate-200">
          <HubView
            title="Ruang Belajar (Hub)"
            description="Akses cepat ke semua fitur pembelajaran Anda."
            items={hubItems}
          />
        </div>

        {/* Progress & Gamification Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8">
          {/* XP Progress */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">XP Progress</h3>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700">EDIT GOAL</button>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-bold text-slate-700">Daily Goal</span>
                  <span className="text-xs font-bold text-slate-400">{xp % dailyGoal}/{dailyGoal} XP</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((xp % dailyGoal) / dailyGoal) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            {/* Simple Chart Mockup */}
            <div className="h-24 flex items-end justify-between gap-1 pt-4 border-t border-slate-100 mt-auto">
              {['Th', 'F', 'Sa', 'Su', 'M', 'Tu', 'W'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full bg-yellow-100 rounded-t-sm" style={{ height: i === 1 ? '60%' : i === 2 ? '40%' : i === 5 ? '80%' : '10%' }}></div>
                  <span className="text-[10px] font-bold text-slate-400">{day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Achievements */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Pencapaian</h3>
              <button className="text-xs font-bold text-blue-600 hover:text-blue-700">LIHAT SEMUA</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-auto">
              {achievements.slice(0, 3).map((achievement) => {
                const Icon = achievement.icon === 'crown' ? Crown : achievement.icon === 'zap' ? Zap : achievement.icon === 'target' ? Target : Star;
                const colorClass = achievement.icon === 'crown' ? 'text-yellow-600 fill-yellow-500' : achievement.icon === 'zap' ? 'text-slate-400 fill-slate-400' : achievement.icon === 'target' ? 'text-blue-600' : 'text-yellow-500';
                const bgClass = achievement.icon === 'crown' ? 'bg-yellow-100 border-yellow-400' : achievement.icon === 'zap' ? 'bg-slate-100 border-slate-300' : achievement.icon === 'target' ? 'bg-blue-100 border-blue-400' : 'bg-yellow-50 border-yellow-200';

                return (
                  <div key={achievement.id} className="flex flex-col items-center gap-2">
                    <div className={cn("w-14 h-14 rounded-full border-2 flex items-center justify-center shadow-inner", bgClass)}>
                      <Icon className={cn("w-7 h-7", colorClass)} />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">{achievement.title}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress Quiz */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-5 flex flex-col h-full">
            <h3 className="font-bold text-slate-900 mb-4">Progress Quiz</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0 font-bold">
                -
              </div>
              <div>
                <p className="text-sm text-slate-600">Belum ada riwayat kuis</p>
                <button onClick={() => setShowQuizHistory(true)} className="text-xs font-bold text-slate-400 mt-1 cursor-pointer hover:text-slate-600 transition-colors">SEE HISTORY</button>
              </div>
            </div>
            <button onClick={() => navigate('/quiz')} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors mt-auto">
              TAKE A QUIZ
            </button>
          </div>
        </div>

      </div>

      <AnimatePresence>
        {showQuizHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Progress Quiz History</h3>
                <button onClick={() => setShowQuizHistory(false)} className="text-slate-400 hover:text-slate-600">
                  <span className="text-2xl leading-none">&times;</span>
                </button>
              </div>
              <div className="p-6 space-y-4 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">Belum ada riwayat kuis yang tersedia.</p>
              </div>
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button onClick={() => setShowQuizHistory(false)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all">
                  CLOSE
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showBadgeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden text-center p-8 relative"
            >
              <button
                onClick={() => setShowBadgeModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
              >
                <span className="text-2xl leading-none">&times;</span>
              </button>

              <h3 className="text-2xl font-bold text-slate-900 mb-2">Reward Claimed!</h3>
              <p className="text-slate-500 mb-8">You earned 10 XP for logging in today.</p>

              <div className="relative w-48 h-48 mx-auto mb-8 perspective-1000">
                <motion.div
                  animate={{ rotateY: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full preserve-3d"
                >
                  <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-2xl border-4 border-yellow-200">
                    <Star className="w-24 h-24 text-white fill-white" />
                  </div>
                  <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-2xl border-4 border-yellow-300 rotate-y-180">
                    <Trophy className="w-24 h-24 text-white fill-white" />
                  </div>
                </motion.div>
              </div>

              <button
                onClick={() => {
                  alert("Shared to feed!");
                  setShowBadgeModal(false);
                }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition-transform active:scale-95 shadow-lg shadow-blue-200"
              >
                SHARE TO FEED
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showJoinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden p-6 relative"
            >
              <button
                onClick={() => {
                  setShowJoinModal(false);
                  setJoinSuccess(false);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-slate-900 mb-2">Gabung Kelas</h3>
              <p className="text-sm text-slate-500 mb-6">Masukkan kode kelas dari gurumu.</p>

              {!joinSuccess && joinError && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-xl flex items-start gap-2 border border-red-100">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{joinError}</span>
                </div>
              )}

              {joinSuccess ? (
                <div className="text-center py-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  </motion.div>
                  <h4 className="text-lg font-bold text-slate-900 mb-2">Berhasil Bergabung!</h4>
                  <p className="text-sm text-slate-500 mb-6">Kamu telah ditambahkan ke dalam kelas.</p>
                </div>
              ) : (
                <form onSubmit={handleJoinClass} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      value={joinCodeInput}
                      onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                      placeholder="Contoh: XH2K7"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none uppercase font-bold tracking-widest text-center text-lg placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!joinCodeInput.trim() || isJoining}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {isJoining ? 'Bergabung...' : 'Gabung'}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
