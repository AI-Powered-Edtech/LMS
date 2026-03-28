const stats = Array.from({ length: 10000 }).map((_, i) => ({
  total_enrolled: Math.floor(Math.random() * 100),
  active_students: Math.floor(Math.random() * 100),
  avg_progress: Math.random() * 100,
  avg_quiz_score: Math.random() * 100,
  last_refreshed_at: new Date(Date.now() - Math.random() * 1000000).toISOString()
}));

console.time('6 passes (no dates)');
for (let j = 0; j < 100; j++) {
  const totalEnrolled = stats.reduce((sum, s) => sum + (s.total_enrolled || 0), 0);
  const activeStudents = stats.reduce((sum, s) => sum + (s.active_students || 0), 0);
  const coursesRunning = stats.filter((s) => (s.active_students || 0) > 0).length;
  const avgProgress = stats.length > 0 ? stats.reduce((sum, s) => sum + (s.avg_progress || 0), 0) / stats.length : 0;
  const avgQuizScore = stats.length > 0 ? stats.reduce((sum, s) => sum + (s.avg_quiz_score || 0), 0) / stats.length : 0;
}
console.timeEnd('6 passes (no dates)');

console.time('1 pass (no dates)');
for (let j = 0; j < 100; j++) {
  let totalEnrolled = 0;
  let activeStudents = 0;
  let coursesRunning = 0;
  let sumProgress = 0;
  let sumQuizScore = 0;

  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    totalEnrolled += s.total_enrolled || 0;
    activeStudents += s.active_students || 0;
    if ((s.active_students || 0) > 0) coursesRunning++;
    sumProgress += s.avg_progress || 0;
    sumQuizScore += s.avg_quiz_score || 0;
  }
  const avgProgress = stats.length > 0 ? sumProgress / stats.length : 0;
  const avgQuizScore = stats.length > 0 ? sumQuizScore / stats.length : 0;
}
console.timeEnd('1 pass (no dates)');
