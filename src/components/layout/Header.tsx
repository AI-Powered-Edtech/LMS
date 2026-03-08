import { Flame, Star, UserCircle, LogOut, Bell, Moon, Sun, Activity } from "lucide-react";
import { cn } from "@/src/utils/cn";
import { useAuth, Role } from "@/src/contexts/AuthContext";
import { useNotifications } from "@/src/contexts/NotificationContext";
import { useTheme } from "@/src/contexts/ThemeContext";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

export function Header() {
  const streak = 5;
  const hasLoggedInToday = false; // Simulasi: abu-abu jika pengguna tidak login hari itu
  const xp = 1250;
  const levelXp = 2000;
  const progress = (xp / levelXp) * 100;

  const { role, profile, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
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

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          ) : (
            <Sun className="w-5 h-5 text-yellow-400" />
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors relative"
          >
            <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                <h3 className="font-bold text-slate-800 dark:text-slate-200">Notifikasi</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markAsRead(notif.id);
                        setIsNotifOpen(false);
                      }}
                      className={cn(
                        "p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer",
                        !notif.is_read && "bg-blue-50/30 dark:bg-blue-900/10"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                          !notif.is_read ? "bg-blue-500" : "bg-transparent"
                        )} />
                        <div>
                          <p className={cn("text-sm font-bold", !notif.is_read ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300")}>
                            {notif.title}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {notif.message}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-medium">
                            {new Date(notif.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <Bell className="w-8 h-8 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">Belum ada notifikasi</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Avatar Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            data-testid="profile-avatar-button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
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
