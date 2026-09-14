// Client-side computation replacing pg_cron server-side calculations
// These functions compute display values from raw data without hitting the DB

// Matches compute_level() SQL function in 822_streaks_xp.sql
// Level thresholds: L1=0, L2=100, L3=250, L4=500, L5=1000, L6=2000, L7=3500, L8=5500, L9=8000, L10=12000
export function computeLevel(totalXP: number): number {
  if (totalXP >= 12000) return 10;
  if (totalXP >= 8000) return 9;
  if (totalXP >= 5500) return 8;
  if (totalXP >= 3500) return 7;
  if (totalXP >= 2000) return 6;
  if (totalXP >= 1000) return 5;
  if (totalXP >= 500) return 4;
  if (totalXP >= 250) return 3;
  if (totalXP >= 100) return 2;
  return 1;
}

export function computeXPToNextLevel(totalXP: number): {
  current: number;
  needed: number;
  pct: number;
} {
  const thresholds = [
    0,
    100,
    250,
    500,
    1000,
    2000,
    3500,
    5500,
    8000,
    12000,
    Infinity,
  ];
  const level = computeLevel(totalXP);
  const levelMin = thresholds[level - 1];
  const levelMax = thresholds[level];
  const current = totalXP - levelMin;
  const needed = levelMax === Infinity ? 0 : levelMax - levelMin;
  const pct =
    needed === 0 ? 100 : Math.min(100, Math.round((current / needed) * 100));
  return { current, needed, pct };
}

// Calculate current streak from sorted completion dates (most recent first)
// A streak is maintained if completions exist on consecutive calendar days
export function calculateStreak(completions: { completed_at: string }[]): {
  current: number;
  longest: number;
} {
  if (!completions.length) return { current: 0, longest: 0 };

  // Get unique dates (YYYY-MM-DD) sorted descending
  const dates = [
    ...new Set(completions.map((c) => c.completed_at.slice(0, 10))),
  ].sort((a, b) => (a < b ? 1 : -1));

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  let isCurrentStreak = dates[0] === today || dates[0] === yesterday;
  let current = isCurrentStreak ? 1 : 0;
  let longest = 1;
  let currentRun = 1;

  let prevTime = Date.parse(dates[0]);
  // Compute current and longest streak across all dates in a single pass
  for (let i = 1; i < dates.length; i++) {
    const currTime = Date.parse(dates[i]);
    const diffDays = Math.round((prevTime - currTime) / 86400000);
    if (diffDays === 1) {
      currentRun++;
      if (isCurrentStreak) current = currentRun;
    } else {
      currentRun = 1;
      isCurrentStreak = false;
    }
    if (currentRun > longest) longest = currentRun;
    prevTime = currTime;
  }

  return { current, longest };
}

// Client-side leaderboard ranking (for display ordering)
export function rankLeaderboard<
  T extends { id: string; total_xp?: number; streak_current?: number },
>(students: T[], sortBy: "xp" | "streak" = "xp"): Array<T & { rank: number }> {
  const sorted = [...students].sort((a, b) =>
    sortBy === "xp"
      ? (b.total_xp || 0) - (a.total_xp || 0)
      : (b.streak_current || 0) - (a.streak_current || 0),
  );
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}
