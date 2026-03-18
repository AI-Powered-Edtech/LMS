import { useState, useEffect } from "react";
import {
  Star, Crown, AlertTriangle, Play, Clock,
  ArrowRight, Target, Trophy, Zap,
  Eye, User, Users, BookOpen, Megaphone, Plus
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { motion } from "motion/react";

import { Link, useNavigate, useLocation } from "react-router-dom";
import { navigationItems } from "@/src/config/navigation";
import { HubView } from "@/src/components/HubView";
import { useAuth } from "@/src/contexts/AuthContext";
import { useStudentProgressData, useAddXP } from '@/src/hooks/useStudentProgressQueries';
import { useAssignments } from "@/src/features/assignments/hooks/useAssignments";
import { useClassroom } from "@/src/hooks/useClassroomQueries";
import { useCourses } from "@/src/features/courses";
import { useAnnouncements } from "@/src/features/announcements";
import { useLeaderboard } from "@/src/features/gamification";
import type { Announcement } from "@/src/features/announcements";
import type { LeaderboardEntry } from "@/src/features/gamification";

import { Card, Badge, Button, EmptyState, SkeletonCard } from '@/src/components/ui';
import { JoinClassModal } from './dashboard/JoinClassModal';
import { QuizHistoryModal } from './dashboard/QuizHistoryModal';
import { BadgeRewardModal } from './dashboard/BadgeRewardModal';

export function Dashboard() {
  const { role, activeTenant } = useAuth();
  const { xp, dailyGoal, achievements } = useStudentProgressData();
  const { mutate: addXP } = useAddXP();
  const { assignments, loading: assignmentsLoading } = useAssignments();
  const { classrooms, activeClassroomId, joinClassroom } = useClassroom();

  // React Query hooks for previously hardcoded data
  const { data: courses, isLoading: loadingCourses } = useCourses({ limit: 4 });
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements({ limit: 2, status: 'published' });
  const { data: leaderboard, isLoading: loadingLeaderboard } = useLeaderboard(activeClassroomId);

  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [showQuizHistory, setShowQuizHistory] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinInitialCode, setJoinInitialCode] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const impersonatedStudent = location.state?.impersonateStudent;

  // Handle deep link join: /?join=XH2K7
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const joinCode = searchParams.get('join');
    if (joinCode && role === 'student') {
      setJoinInitialCode(joinCode.toUpperCase());
      setShowJoinModal(true);
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location, role]);

  const hubItems = navigationItems.filter(item =>
    item.location === 'learning-hub' && item.roles.includes(role)
  );
  const userName = impersonatedStudent ? impersonatedStudent.name : (role === 'teacher' ? 'Bapak/Ibu Guru' : 'Siswa');
  const activeCourses = Array.isArray(courses) ? courses : (courses as any)?.courses ?? [];
  const announcementList: Announcement[] = Array.isArray(announcements) ? announcements : [];
  const leaderboardList: LeaderboardEntry[] = Array.isArray(leaderboard) ? leaderboard : [];
  const hasLeaderboardData = leaderboardList.length > 0;

  const handleClaimReward = () => {
    if (isClaiming) return;
    setIsClaiming(true);
    setTimeout(() => {
      addXP(10);
      setShowBadgeModal(true);
      setIsClaiming(false);
      import("canvas-confetti").then((m) => {
        const confetti = m.default || m;
        (confetti as any)({ particleCount: 150, spread: 100, origin: { y: 0.5 }, colors: ["#fbbf24", "#f59e0b", "#d97706"] });
      });
    }, 800);
  };

  const pendingAssignments = (assignments || []).filter(a => a.status === 'assigned' || a.status === 'late').slice(0, 3);

  return (
    <div className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 p-4 md:p-8">
      {/* Impersonation Banner */}
      {impersonatedStudent && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-amber-100 border-b border-amber-200 px-4 py-3 flex items-center justify-between text-amber-900 shadow-sm">
          <div className="flex items-center gap-2 font-medium">
            <Eye className="w-4 h-4" />
            <span>Viewing as <span className="font-bold">{impersonatedStudent.name}</span></span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Exit Student View</Button>
        </div>
      )}

      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Welcome Card */}
        <Card padding="md">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Selamat Datang, {userName}!</h1>
          <p className="text-sm sm:text-base text-slate-500 mt-1">Siap untuk melanjutkan petualangan belajarmu hari ini?</p>
        </Card>

        {/* Kelas Saya (Student Only) */}
        {role === 'student' && (
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-500" />
                Kelas Saya
              </h2>
              <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowJoinModal(true)}>
                Gabung Kelas
              </Button>
            </div>
            {classrooms.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map(cls => (
                  <Card key={cls.id} padding="sm" hover onClick={() => navigate(`/classes/${cls.id}`)}>
                    <h3 className="font-bold text-slate-800">{cls.name}</h3>
                    <p className="text-sm text-slate-500 mt-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {cls.teacher_name || 'Guru'}
                    </p>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Users className="w-12 h-12" />}
                title="Belum bergabung di kelas mana pun"
                description="Masukkan kode kelas dari gurumu untuk mulai belajar."
                action={{ label: "Masukkan Kode Kelas", onClick: () => setShowJoinModal(true) }}
              />
            )}
          </Card>
        )}

        {/* Tugas Mendekati Deadline */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Tugas Mendekati Deadline
            </h2>
            <Link to="/assignments" className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Semua</Link>
          </div>
          {assignmentsLoading ? (
            <div className="space-y-3">
              <SkeletonCard lines={1} />
              <SkeletonCard lines={1} />
            </div>
          ) : pendingAssignments.length > 0 ? (
            <div className="space-y-3">
              {pendingAssignments.map((task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => navigate('/assignments')}>
                  <div className={cn("w-3 h-3 rounded-full shrink-0", task.status === 'late' ? "bg-red-500 animate-pulse" : "bg-yellow-400")} />
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="neutral" size="sm">{task.type}</Badge>
                      <span className={cn("text-xs font-bold", task.status === 'late' ? "text-red-600" : "text-slate-500")}>
                        {new Date(task.dueDate).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertTriangle className="w-10 h-10" />}
              title="Tidak ada tugas mendesak"
              description="Semua tugasmu sudah terkendali."
            />
          )}
        </Card>

        {/* Lanjutkan Belajar (Student Only) */}
        {role === 'student' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Play className="w-5 h-5 text-indigo-500" />
                Lanjutkan Belajar
              </h2>
              <Link to="/courses" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Lihat Semua Materi</Link>
            </div>
            {loadingCourses ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : activeCourses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {activeCourses.slice(0, 4).map((course: any) => (
                  <motion.div key={course.id} whileHover={{ y: -4 }}>
                    <Card hover onClick={() => navigate(`/courses/${course.id}`)}>
                      <div className="aspect-video rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 flex items-center justify-center overflow-hidden relative">
                        <BookOpen className="w-10 h-10 text-white/50" />
                      </div>
                      <h3 className="font-bold text-slate-900 line-clamp-1 mb-1">{course.title}</h3>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="success" size="sm">AKTIF</Badge>
                        <ArrowRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={<BookOpen className="w-12 h-12" />}
                  title="Belum ada materi"
                  description="Gabung ke kelas untuk mulai belajar."
                  action={{ label: "Gabung Kelas", onClick: () => setShowJoinModal(true) }}
                />
              </Card>
            )}
          </div>
        )}

        {/* Bottom Grid: Pengumuman & Leaderboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pengumuman (FROM API) */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-purple-500" />
                Pengumuman Terbaru
              </h2>
              <Link to="/announcements" className="text-sm font-bold text-blue-600 hover:text-blue-700">Semua</Link>
            </div>
            {loadingAnnouncements ? (
              <div className="space-y-3"><SkeletonCard lines={2} /><SkeletonCard lines={2} /></div>
            ) : announcementList.length > 0 ? (
              <div className="space-y-4">
                {announcementList.map((ann) => (
                  <div
                    key={ann.id}
                    className={cn(
                      "p-4 rounded-2xl border transition-colors cursor-pointer",
                      ann.priority === 'high'
                        ? "bg-red-50 border-red-100 hover:bg-red-100/60"
                        : "border-slate-100 hover:bg-slate-50"
                    )}
                    onClick={() => navigate('/announcements')}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={ann.priority === 'high' ? 'danger' : 'info'} size="sm">
                        {ann.priority === 'high' ? 'URGENT' : 'INFO'}
                      </Badge>
                      <span className={cn("text-xs font-medium", ann.priority === 'high' ? "text-red-500" : "text-slate-500")}>
                        {new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                    <h3 className={cn("font-bold mb-1", ann.priority === 'high' ? "text-red-900" : "text-slate-800")}>{ann.title}</h3>
                    <p className={cn("text-sm line-clamp-2", ann.priority === 'high' ? "text-red-700/80" : "text-slate-600")}>{ann.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<Megaphone className="w-10 h-10" />}
                title="Belum ada pengumuman"
                description="Pengumuman dari guru akan muncul di sini."
              />
            )}
          </Card>

          {/* Leaderboard (FROM API) */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Leaderboard Snapshot
              </h2>
              <Link to="/leaderboard" className="text-sm font-bold text-blue-600 hover:text-blue-700">Lihat Peringkat</Link>
            </div>
            {loadingLeaderboard ? (
              <SkeletonCard lines={3} />
            ) : hasLeaderboardData ? (
              <div className="flex flex-col justify-center items-center text-center p-4 sm:p-6 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/10 dark:to-slate-900 rounded-2xl border border-yellow-100 dark:border-yellow-900/30">
                <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4 shadow-inner border-4 border-white dark:border-slate-800">
                  <Crown className="w-10 h-10 text-yellow-500" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{xp} XP</h3>
                <div className="w-full max-w-xs bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2 mt-4">
                  <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${(xp % 100)}%` }} />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Butuh <strong className="text-yellow-600">{100 - (xp % 100)} XP</strong> lagi untuk naik peringkat
                </p>
              </div>
            ) : (
              <EmptyState
                icon={<Trophy className="w-10 h-10" />}
                title="Belum ada peringkat"
                description="Gabung ke kelas dan selesaikan aktivitas untuk masuk leaderboard."
              />
            )}
          </Card>
        </div>

        {/* Hub View */}
        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
          <HubView title="Ruang Belajar (Hub)" description="Akses cepat ke semua fitur pembelajaran Anda." items={hubItems} />
        </div>

        {/* Progress & Gamification Widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mt-8">
          {/* XP Progress */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">XP Progress</h3>
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-1">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Daily Goal</span>
                  <span className="text-xs font-bold text-slate-400">{xp % dailyGoal}/{dailyGoal} XP</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-yellow-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, ((xp % dailyGoal) / dailyGoal) * 100)}%` }} />
                </div>
              </div>
            </div>
            <div className="h-24 flex items-end justify-between gap-1 pt-4 border-t border-slate-100 dark:border-slate-700 mt-auto">
              {['Th', 'F', 'Sa', 'Su', 'M', 'Tu', 'W'].map((day, i) => (
                <div key={i} className="flex flex-col items-center gap-2 flex-1">
                  <div className="w-full bg-yellow-100 dark:bg-yellow-900/30 rounded-t-sm" style={{ height: i === 1 ? '60%' : i === 2 ? '40%' : i === 5 ? '80%' : '10%' }} />
                  <span className="text-[10px] font-bold text-slate-400">{day}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Achievements */}
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900 dark:text-white">Pencapaian</h3>
            </div>
            {achievements.length > 0 ? (
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
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 text-center leading-tight">{achievement.title}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<Star className="w-8 h-8" />} title="Belum ada pencapaian" />
            )}
          </Card>

          {/* Quiz Progress */}
          <Card>
            <h3 className="font-bold text-slate-900 dark:text-white mb-4">Progress Quiz</h3>
            <EmptyState
              icon={<Clock className="w-8 h-8" />}
              title="Belum ada riwayat kuis"
              action={{ label: "Mulai Kuis", onClick: () => navigate('/quiz') }}
            />
          </Card>
        </div>
      </div>

      {/* Modals */}
      <JoinClassModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        initialCode={joinInitialCode}
        onJoin={joinClassroom}
      />
      <QuizHistoryModal open={showQuizHistory} onClose={() => setShowQuizHistory(false)} />
      <BadgeRewardModal open={showBadgeModal} onClose={() => setShowBadgeModal(false)} />
    </div>
  );
}
