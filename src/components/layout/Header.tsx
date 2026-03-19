import { Flame, Star, UserCircle, LogOut, Bell, Moon, Sun, Activity } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useAuth, Role } from "@/src/contexts/AuthContext";
import { useNotifications, useMarkAsRead, useMarkAllAsRead } from "@/src/features/notifications";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { useStudentProgressData } from '@/src/hooks/useStudentProgressQueries';
import { NotificationCenter } from "../Social/NotificationCenter";

export function Header() {
  const streak = 5;
  const hasLoggedInToday = false; // Simulasi: abu-abu jika pengguna tidak login hari itu
  const { xp } = useStudentProgressData();
  const levelXp = Math.floor(xp / 2000 + 1) * 2000;
  const progress = Math.min((xp / levelXp) * 100, 100);

  const { role, profile, signOut } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const roleLabels: Record<Role, string> = {
    student: 'Siswa',
    teacher: 'Guru',
    admin: 'Administrator'
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 md:px-8 transition-colors duration-300">
      <div className="flex items-center gap-4 md:hidden">
        <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">E</span>
        </div>
      </div>

      <div className="flex-1 md:flex-none" />

      <div className="flex items-center gap-4 sm:gap-6">
        {/* Streak Indicator */}
        <div className="flex items-center gap-2">
          <Flame
            className={cn(
              "w-6 h-6",
              hasLoggedInToday ? "text-orange-500 fill-orange-500" : "text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600",
            )}
          />
          <span
            className={cn(
              "font-bold",
              hasLoggedInToday ? "text-orange-600" : "text-slate-400 dark:text-slate-500",
            )}
          >
            {streak}
          </span>
        </div>

        {/* Stats/Metrics */}
        <div className="flex items-center gap-3">
          {role === 'teacher' ? (
            <div className="flex items-center gap-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-500 px-3 py-1.5 rounded-lg font-bold text-sm">
              <Activity className="w-4 h-4" />
              35 Students
            </div>
          ) : (
            <>
              <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 px-2 py-1 rounded-lg font-bold text-sm">
                <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                {xp} XP
              </div>
              <div className="hidden sm:block w-32 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </>
          )}
        </div>



        {/* Notification Bell */}
        <NotificationCenter />

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            data-testid="profile-avatar-button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            aria-expanded={isProfileOpen}
            aria-haspopup="true"
            className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 border-2 border-white dark:border-slate-800 shadow-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
              alt="Avatar"
              className="w-full h-full object-cover"
            />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {profile?.first_name} {profile?.last_name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{roleLabels[role]}</p>
              </div>
              <div className="p-2 space-y-1">
                <button
                  onClick={() => { navigate('/profile'); setIsProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-left"
                >
                  <UserCircle className="w-4 h-4" />
                  Profil Saya
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Keluar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
