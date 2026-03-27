const students = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}` }));
const grades = {};
for (let i = 0; i < 50; i++) {
  grades[`s${i}`] = {};
  for (let j = 0; j < 20; j++) {
    grades[`s${i}`][`a${j}`] = { score: Math.random() * 100 };
  }
}

console.time('current');
for (let k = 0; k < 100; k++) {
  students.map((s) => {
    const studentGrades = grades[s.id];
    if (!studentGrades) return 0;
    const scores = Object.values(studentGrades).map(entry => entry.score).filter(score => score !== null);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / scores.length);
  }).filter(avg => avg > 0);
}
console.timeEnd('current');
