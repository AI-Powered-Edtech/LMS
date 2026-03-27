const students = Array.from({ length: 50 }, (_, i) => ({ id: `s${i}` }));
const grades = {};
for (let i = 0; i < 50; i++) {
  grades[`s${i}`] = {};
  for (let j = 0; j < 20; j++) {
    grades[`s${i}`][`a${j}`] = { score: Math.random() * 100 };
  }
}

console.time('optimized');
for (let k = 0; k < 100; k++) {
  const allAverages = [];
  for (let i = 0; i < students.length; i++) {
    const s = students[i];
    const studentGrades = grades[s.id];
    if (!studentGrades) continue;
    let sum = 0;
    let count = 0;
    for (const key in studentGrades) {
      const score = studentGrades[key].score;
      if (score !== null) {
        sum += score;
        count++;
      }
    }
    if (count > 0) {
      const avg = Math.round(sum / count);
      if (avg > 0) {
        allAverages.push(avg);
      }
    }
  }
}
console.timeEnd('optimized');
