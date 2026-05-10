// ==========================================================================
// ParentLayout — Mobile-first layout untuk orang tua
// Wave 4 — Task 29.3
//
// Design:
// - Sticky header (logo + judul + avatar + logout)
// - Bottom navigation (mobile): Beranda, Nilai, Kehadiran, Pesan
// - TIDAK ada sidebar — mobile-only design
// - Safe area handling untuk notch/home indicator (iOS/Android)
// - Dark mode support
// ==========================================================================

import { Link, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/utils/cn";

// ── Bottom Nav Item ────────────────────────────────────────────

interface NavItem {
  to: string;
  label: string;
  icon: string;
  activeIcon: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/app/parent", label: "Beranda", icon: "🏠", activeIcon: "🏡" },
  { to: "/app/parent/nilai", label: "Nilai", icon: "📊", activeIcon: "📈" },
  {
    to: "/app/parent/kehadiran",
    label: "Kehadiran",
    icon: "📅",
    activeIcon: "📆",
  },
  { to: "/app/parent/pesan", label: "Pesan", icon: "💬", activeIcon: "💬" },
];

function BottomNavItem({
  item,
  isActive,
}: {
  item: NavItem;
  isActive: boolean;
}) {
  return (
    <Link
      to={item.to}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5",
        "min-h-[56px] min-w-[56px] flex-1 px-2 py-2",
        "text-xs font-medium transition-colors duration-150",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset",
        "rounded-xl",
        isActive
          ? "text-blue-600 dark:text-blue-400"
          : "text-slate-500 dark:text-slate-400 active:text-blue-600 dark:active:text-blue-400",
      )}
      aria-current={isActive ? "page" : undefined}
      aria-label={item.label}
    >
      <span className="text-xl leading-none" aria-hidden="true">
        {isActive ? item.activeIcon : item.icon}
      </span>
      <span className={cn(isActive ? "font-semibold" : "")}>{item.label}</span>
    </Link>
  );
}

// ── Header Avatar ──────────────────────────────────────────────

function HeaderAvatar({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null | undefined;
}) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div
      className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center
                 text-xs font-bold text-blue-700 dark:text-blue-300 overflow-hidden flex-shrink-0"
      aria-hidden="true"
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}

// ── Parent Layout ──────────────────────────────────────────────

export function ParentLayout() {
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const displayName = profile
    ? `${profile.first_name ?? ""} ${profile.last_name ?? ""}`.trim() ||
      "Orang Tua"
    : "Orang Tua";

  return (
    <div
      className="flex flex-col bg-gray-50 dark:bg-gray-900 font-sans text-slate-900 dark:text-slate-100
                 transition-colors duration-300"
      style={{ minHeight: "100dvh" }}
    >
      {/* ── Sticky Header ──────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between
                   px-4 py-3 gap-3
                   bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
                   border-b border-slate-200/80 dark:border-slate-700/60
                   safe-top"
        style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
      >
        {/* Logo + Judul */}
        <Link
          to="/app/parent"
          className="flex items-center gap-2 min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg"
          aria-label="Beranda Dashboard Orang Tua"
        >
          <span className="text-xl leading-none" aria-hidden="true">
            🏫
          </span>
          <div>
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400 leading-none">
              EduSync
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
              Dashboard Orang Tua
            </p>
          </div>
        </Link>

        {/* Right: Avatar + Nama + Logout */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <HeaderAvatar name={displayName} avatarUrl={profile?.avatar_url} />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[80px] truncate hidden xs:block">
              {displayName.split(" ")[0]}
            </p>
          </div>

          <button
            onClick={() => signOut()}
            className="min-h-[36px] min-w-[36px] rounded-xl flex items-center justify-center
                       text-slate-500 dark:text-slate-400
                       hover:bg-slate-100 dark:hover:bg-slate-800
                       active:bg-slate-200 dark:active:bg-slate-700
                       transition-colors duration-150
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Keluar"
            title="Keluar"
          >
            <span className="text-base" aria-hidden="true">
              🚪
            </span>
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────── */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 overflow-y-auto outline-none"
      >
        {/* Inner padding dengan scroll area */}
        <div className="px-4 py-4 max-w-lg mx-auto">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom Navigation ────────────────────────────────── */}
      <nav
        className="sticky bottom-0 z-40 flex items-stretch
                   bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
                   border-t border-slate-200/80 dark:border-slate-700/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigasi utama"
      >
        {NAV_ITEMS.map((item) => {
          // Exact match untuk root parent, prefix match untuk sub-pages
          const isActive =
            item.to === "/app/parent"
              ? location.pathname === "/app/parent"
              : location.pathname.startsWith(item.to);

          return (
            <BottomNavItem key={item.to} item={item} isActive={isActive} />
          );
        })}
      </nav>
    </div>
  );
}
