import { aggregateTenantOverview } from './src/features/analytics/api/analyticsAggregation.ts'

const stats = Array.from({ length: 100000 }).map((_, i) => ({
  course_id: `course_${i}`,
  total_enrolled: Math.floor(Math.random() * 100),
  active_students: Math.floor(Math.random() * 50),
  avg_progress: Math.random() * 100,
  avg_quiz_score: Math.random() * 100,
  last_refreshed_at: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
}))

function runOriginal() {
  const start = performance.now()

  if (stats.length === 0) return

  const totalEnrolled = stats.reduce((sum, s) => sum + (s.total_enrolled || 0), 0)
  const activeStudents = stats.reduce((sum, s) => sum + (s.active_students || 0), 0)
  const coursesRunning = stats.filter((s) => (s.active_students || 0) > 0).length
  const avgProgress = stats.length > 0 ? stats.reduce((sum, s) => sum + (s.avg_progress || 0), 0) / stats.length : 0
  const avgQuizScore = stats.length > 0 ? stats.reduce((sum, s) => sum + (s.avg_quiz_score || 0), 0) / stats.length : 0
  const lastRefreshedAt = stats.length > 0 ? stats.reduce((latest, s) => {
    const current = s.last_refreshed_at
    return !latest || (current && new Date(current) > new Date(latest)) ? current : latest
  }, null as string | null) : null

  return performance.now() - start
}

function runOptimized() {
  const start = performance.now()

  if (stats.length === 0) return

  let totalEnrolled = 0
  let activeStudents = 0
  let coursesRunning = 0
  let sumProgress = 0
  let sumQuizScore = 0
  let lastRefreshedAt: string | null = null

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i]
    totalEnrolled += s.total_enrolled || 0
    if ((s.active_students || 0) > 0) {
      coursesRunning++
    }
    activeStudents += s.active_students || 0
    sumProgress += s.avg_progress || 0
    sumQuizScore += s.avg_quiz_score || 0

    if (s.last_refreshed_at) {
      if (!lastRefreshedAt || new Date(s.last_refreshed_at) > new Date(lastRefreshedAt)) {
        lastRefreshedAt = s.last_refreshed_at
      }
    }
  }

  const avgProgress = sumProgress / stats.length
  const avgQuizScore = sumQuizScore / stats.length

  return performance.now() - start
}

let origTotal = 0
let optTotal = 0
for(let i=0; i<5; i++) {
  origTotal += runOriginal()
  optTotal += runOptimized()
}

console.log(`Original: ${origTotal / 5}ms`)
console.log(`Optimized: ${optTotal / 5}ms`)
