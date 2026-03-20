import {
  Mail, Award, Flame, Star, Trophy, Edit3,
  GraduationCap, ShieldCheck, CheckCircle
} from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useAuth } from "@/src/contexts/AuthContext";
import { BadgeShowcase } from "@/src/features/gamification/components/BadgeShowcase";
import { CertificateViewer } from "@/src/features/gamification/components/CertificateViewer";
import { XPProgressBar } from "@/src/features/gamification/components/XPProgressBar";
import { StreakCounter } from "@/src/features/gamification/components/StreakCounter";
import { useStudentXPProfile, useStudentCertificates } from "@/src/features/gamification/queries/gamificationQueries";
import { useStudentProgressData } from "@/src/hooks/useStudentProgressQueries";

export function Profile() {
  const { user, role, profile } = useAuth();
  const isTeacher = role === 'teacher';

  // Real data hooks (only active for students, but safe to call unconditionally)
  const { data: xpProfile } = useStudentXPProfile();
  const { data: certificates = [] } = useStudentCertificates();
  const { assignments } = useStudentProgressData();

  // Derived identity
  const displayName = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`
    : user?.user_metadata?.full_name ?? 'Pengguna';
  const displayEmail = user?.email ?? '';
  const avatarUrl = profile?.avatar_url ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id ?? 'default'}`;

  // Role label
  const roleLabel = role === 'teacher'
    ? 'Guru'
    : role === 'admin'
      ? 'Admin'
      : 'Siswa';

  // Student stats from real data
  const totalXP = xpProfile?.total_xp ?? 0;
  const currentStreak = xpProfile?.streak_current ?? 0;
  const assignmentCount = assignments?.length ?? 0;
  const certificateCount = certificates?.length ?? 0;

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
            )} />

            <div className="relative mt-8 mb-4">
              <div className="w-24 h-24 rounded-full bg-white p-1 shadow-md">
                <img src={avatarUrl} alt={displayName} className="w-full h-full rounded-full bg-slate-100 object-cover" />
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 transition-colors">
                <Edit3 className="w-4 h-4" />
              </button>
            </div>

            <h2 className="text-xl font-bold text-slate-900">{displayName}</h2>
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-bold border",
                isTeacher ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
              )}>
                {roleLabel}
              </span>
              {isTeacher && <span title="Verified Teacher"><ShieldCheck className="w-4 h-4 text-emerald-500" /></span>}
              {!isTeacher && currentStreak > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  {currentStreak} Hari
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1 text-slate-500 text-sm mt-2">
              <div className="flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" /> {displayEmail}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Overview Content */}
        <div className="w-full lg:w-2/3">
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isTeacher ? (
              <TeacherOverview displayName={displayName} />
            ) : (
              <StudentOverview
                assignmentCount={assignmentCount}
                certificateCount={certificateCount}
                totalXP={totalXP}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Student Overview ----------

function StudentOverview({
  assignmentCount,
  certificateCount,
  totalXP,
}: {
  assignmentCount: number;
  certificateCount: number;
  totalXP: number;
}) {
  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          iconBg="bg-blue-100 text-blue-600"
          value={assignmentCount}
          label="Tugas"
        />
        <StatCard
          icon={<Award className="w-5 h-5" />}
          iconBg="bg-yellow-100 text-yellow-600"
          value={certificateCount}
          label="Sertifikat"
        />
        <StatCard
          icon={<Star className="w-5 h-5" />}
          iconBg="bg-purple-100 text-purple-600"
          value={totalXP}
          label="Total XP"
        />
      </div>

      {/* XP Progress & Streak */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <XPProgressBar />
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          <StreakCounter />
        </div>
      </div>

      {/* Badge Showcase */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Lencana & Pencapaian
          </h2>
        </div>
        <BadgeShowcase />
      </div>

      {/* Certificates */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-amber-500" />
          Sertifikat
        </h2>
        <CertificateViewer />
      </div>
    </>
  );
}

// ---------- Teacher Overview ----------

function TeacherOverview({ displayName }: { displayName: string }) {
  return (
    <>
      {/* Identity summary for teacher */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
          <GraduationCap className="w-5 h-5 text-emerald-600" />
          Selamat Datang, {displayName}
        </h2>
        <p className="text-sm text-slate-600">
          Gunakan menu navigasi untuk mengelola kelas, melihat analitik, dan memberi nilai tugas siswa.
        </p>
      </div>
    </>
  );
}

// ---------- Stat Card ----------

function StatCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center gap-2">
      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", iconBg)}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900">{value}</p>
        <p className="text-xs font-bold text-slate-500 uppercase">{label}</p>
      </div>
    </div>
  );
}
