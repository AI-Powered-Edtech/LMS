const studentGrades = {
  "a": { score: 100 },
  "b": { score: 50 },
  "c": { score: null },
  "d": { score: 0 },
  "e": { score: 75 }
};

console.time('Object.values + map + filter + reduce');
for (let j = 0; j < 100000; j++) {
  const scores = Object.values(studentGrades)
    .map((entry) => entry.score)
    .filter((score) => score !== null)
  if (scores.length === 0) continue;
  const sum = scores.reduce((a, b) => a + b, 0)
}
console.timeEnd('Object.values + map + filter + reduce');

console.time('1 pass Object.values loop');
for (let j = 0; j < 100000; j++) {
  let sum = 0;
  let count = 0;
  for (const key in studentGrades) {
    const score = studentGrades[key].score;
    if (score !== null) {
      sum += score;
      count++;
    }
  }
}
console.timeEnd('1 pass Object.values loop');
