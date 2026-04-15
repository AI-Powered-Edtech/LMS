// Client-side computation replacing pg_cron server-side calculations
// These functions compute display values from raw data without hitting the DB

// Matches compute_level() SQL function in 822_streaks_xp.sql
// Level thresholds: L1=0, L2=100, L3=250, L4=500, L5=1000, L6=2000, L7=3500, L8=5500, L9=8000, L10=12000
export function computeLevel(totalXP: number): number {
  if (totalXP >= 12000) return 10
  if (totalXP >= 8000) return 9
  if (totalXP >= 5500) return 8
  if (totalXP >= 3500) return 7
  if (totalXP >= 2000) return 6
  if (totalXP >= 1000) return 5
  if (totalXP >= 500) return 4
  if (totalXP >= 250) return 3
  if (totalXP >= 100) return 2
  return 1
}

export function computeXPToNextLevel(totalXP: number): {
  current: number
  needed: number
  pct: number
} {
  const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, Infinity]
  const level = computeLevel(totalXP)
  const levelMin = thresholds[level - 1]
  const levelMax = thresholds[level]
  const current = totalXP - levelMin
  const needed = levelMax === Infinity ? 0 : levelMax - levelMin
  const pct = needed === 0 ? 100 : Math.min(100, Math.round((current / needed) * 100))
  return { current, needed, pct }
}

export function calculateTotalXP(transactions: { xp_amount: number }[]): number {
  return transactions.reduce((sum, t) => sum + (t.xp_amount || 0), 0)
}

// Calculate current streak from sorted completion dates (most recent first)
// A streak is maintained if completions exist on consecutive calendar days
export function calculateStreak(completions: { completed_at: string }[]): {
  current: number
  longest: number
} {
  if (!completions.length) return { current: 0, longest: 0 }

  // Get unique dates (YYYY-MM-DD) sorted descending
  const dates = [...new Set(completions.map((c) => c.completed_at.slice(0, 10)))].sort().reverse()

  let current = 1
  let longest = 1
  let streak = 1

  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

  // If most recent completion is not today or yesterday, current streak is 0
  if (dates[0] !== today && dates[0] !== yesterday) {
    current = 0
  } else {
    // Count consecutive days from most recent
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1])
      const curr = new Date(dates[i])
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
      if (diffDays === 1) {
        streak++
        if (i === dates.length - 1 || streak > current) current = streak
      } else {
        break
      }
    }
    current = streak
  }

  // Compute longest streak across all dates
  let longestRun = 1
  let run = 1
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1])
    const curr = new Date(dates[i])
    const diffDays = Math.round((prev.getTime() - curr.getTime()) / 86400000)
    if (diffDays === 1) {
      run++
      longestRun = Math.max(longestRun, run)
    } else {
      run = 1
    }
  }
  longest = longestRun

  return { current, longest }
}

// Engagement segment based on weekly XP earned
// Matches SQL logic in course_stats refresh
export function getEngagementSegment(weeklyXP: number): 'high' | 'medium' | 'low' | 'at_risk' {
  if (weeklyXP >= 500) return 'high'
  if (weeklyXP >= 200) return 'medium'
  if (weeklyXP >= 50) return 'low'
  return 'at_risk'
}

// Simple progress percentage
export function calculateProgress(completedLessons: number, totalLessons: number): number {
  if (totalLessons === 0) return 0
  return Math.min(100, Math.round((completedLessons / totalLessons) * 100))
}

// Client-side leaderboard ranking (for display ordering)
export function rankLeaderboard<
  T extends { id: string; total_xp?: number; streak_current?: number },
>(students: T[], sortBy: 'xp' | 'streak' = 'xp'): Array<T & { rank: number }> {
  const sorted = [...students].sort((a, b) =>
    sortBy === 'xp'
      ? (b.total_xp || 0) - (a.total_xp || 0)
      : (b.streak_current || 0) - (a.streak_current || 0)
  )
  return sorted.map((s, i) => ({ ...s, rank: i + 1 }))
}
