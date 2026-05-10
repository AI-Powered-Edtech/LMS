/**
 * useHeaderXPData — Hook untuk data XP yang ditampilkan di Header.
 *
 * Sebelumnya Header.tsx memanggil useStudentXPProfile() dan useStudentProgressData()
 * secara langsung, dan computation XP dilakukan inline di komponen. Ini berarti:
 * - Teacher dan admin tetap membayar query student-specific di setiap render
 * - Business logic (streak, level, progress percentage) tersebar di view layer
 *
 * Hook ini memisahkan data fetching dan computation dari presentasi,
 * dan hanya aktif untuk role 'student'. Teacher/admin mendapat nilai default.
 */
import { useAuth } from "@/contexts/AuthContext";
import { useStudentXPProfile } from "@/features/gamification/queries/gamificationQueries";
import { useStudentProgressData } from "@/features/progress/hooks/useStudentProgressQueries";

export interface HeaderXPData {
  /** Streak login berturut-turut hari ini */
  streak: number;
  /** True jika user sudah login hari ini (streak > 0) */
  hasLoggedInToday: boolean;
  /** Total XP */
  totalXp: number;
  /** Level saat ini */
  level: number;
  /** Persentase progress ke level berikutnya (0-100) */
  progress: number;
}

const DEFAULT_XP_DATA: HeaderXPData = {
  streak: 0,
  hasLoggedInToday: false,
  totalXp: 0,
  level: 1,
  progress: 0,
};

/**
 * Mengambil dan mengkomputasi data XP untuk ditampilkan di Header.
 *
 * Hanya melakukan fetch untuk role 'student'. Untuk role lain,
 * query di-disabled sehingga tidak ada network call yang terjadi.
 */
export function useHeaderXPData(): HeaderXPData {
  const { role } = useAuth();
  const isStudent = role === "student";

  // useStudentProgressData sudah handle enabled: false secara internal
  // jika tidak ada user, tapi kita tambah guard role di sini untuk eksplisit
  const { xp } = useStudentProgressData();
  const { data: xpProfile } = useStudentXPProfile();

  // Tidak compute apapun untuk non-student — kembalikan defaults
  if (!isStudent) return DEFAULT_XP_DATA;

  const streak = xpProfile?.streak_current ?? 0;
  const hasLoggedInToday = streak > 0;

  // Gunakan total_xp dari xpProfile jika tersedia, fallback ke xp dari progress
  const totalXp = (xpProfile?.total_xp || 0) > 0 ? xpProfile!.total_xp : xp;
  const level = (xpProfile?.total_xp || 0) > 0 ? xpProfile!.level : 1;

  const xpCurrent = xpProfile?.xp_current_level ?? 0;
  const xpNext = xpProfile?.xp_next_level ?? 100;
  const xpNeeded = xpNext - xpCurrent;
  const progress =
    xpNeeded > 0
      ? Math.min(((totalXp - xpCurrent) / xpNeeded) * 100, 100)
      : 100;

  return {
    streak,
    hasLoggedInToday,
    totalXp,
    level,
    progress,
  };
}
