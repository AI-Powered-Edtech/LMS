const results = Array.from({ length: 100 }).map(() => ({
  points_earned: Math.floor(Math.random() * 10),
  max_points: 10
}));

console.time('reduce twice');
for (let j = 0; j < 100000; j++) {
  const totalScore = results.reduce((sum, r) => sum + r.points_earned, 0)
  const maxScore = results.reduce((sum, r) => sum + r.max_points, 0)
}
console.timeEnd('reduce twice');

console.time('one loop');
for (let j = 0; j < 100000; j++) {
  let totalScore = 0;
  let maxScore = 0;
  for (let i = 0; i < results.length; i++) {
    totalScore += results[i].points_earned;
    maxScore += results[i].max_points;
  }
}
console.timeEnd('one loop');
