const students = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}` }));
const grades = {};
for (let i = 0; i < 50; i++) {
  grades[`s${i}`] = {};
  for (let j = 0; j < 20; j++) {
    grades[`s${i}`][`a${j}`] = { score: Math.random() * 100 };
  }
}

console.time('memoized_approach');
for (let k = 0; k < 100; k++) {
  // We can just memoize the student scores/averages
  const studentStats = {};
  students.forEach(s => {
    const studentGrades = grades[s.id];
    if (!studentGrades) {
      studentStats[s.id] = { avg: 0, total: 0 };
      return;
    }
    let sum = 0;
    let count = 0;
    for (const key in studentGrades) {
      const score = studentGrades[key].score;
      if (score !== null) {
        sum += score;
        count++;
      }
    }
    studentStats[s.id] = {
      avg: count > 0 ? Math.round(sum / count) : 0,
      total: sum
    };
  });

  const allAverages = Object.values(studentStats).map(s => s.avg).filter(avg => avg > 0);
  const classAvg = allAverages.length > 0 ? Math.round(allAverages.reduce((a, b) => a + b, 0) / allAverages.length) : 0;
}
console.timeEnd('memoized_approach');
