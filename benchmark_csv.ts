import { performance } from 'perf_hooks';

// Simulate data
const numStudents = 1000;
const numColumns = 50;

const columns = Array.from({ length: numColumns }).map((_, i) => ({
  id: `col_${i}`,
  title: `Assignment ${i}`,
  max_score: 100,
}));

const entries = [];
for (let i = 0; i < numStudents; i++) {
  for (let j = 0; j < numColumns; j++) {
    if (Math.random() > 0.2) {
      entries.push({
        student_id: `student_${i}`,
        student_name: `Student ${i}`,
        student_email: `student${i}@example.com`,
        assignment_id: `col_${j}`,
        quiz_id: null,
        score: Math.floor(Math.random() * 100),
        max_score: 100,
        percentage: Math.random() * 100,
        grade_letter: 'A',
      });
    }
  }
}

// Map students
const studentMap = new Map();
for (const entry of entries) {
  if (!studentMap.has(entry.student_id)) {
    studentMap.set(entry.student_id, {
      name: entry.student_name ?? entry.student_id,
      email: entry.student_email ?? '',
      grades: {},
    });
  }
  const colId = entry.quiz_id ?? entry.assignment_id ?? '';
  if (colId) {
    studentMap.get(entry.student_id)!.grades[colId] = entry;
  }
}

function originalApproach() {
  const rows = [];
  for (const [, student] of studentMap) {
    const row: Record<string, string | number> = {
      Nama: student.name,
      Email: student.email,
    };
    let totalPct = 0;
    let gradedCount = 0;

    for (const col of columns) {
      const entry = student.grades[col.id] ?? null;
      if (entry && entry.score !== null) {
        row[col.title] = entry.score;
        row[`${col.title} (Maks)`] = col.max_score;
        row[`${col.title} (%)`] = Number(entry.percentage.toFixed(1));
        row[`${col.title} (Huruf)`] = entry.grade_letter ?? '-';
        totalPct += entry.percentage;
        gradedCount++;
      } else {
        row[col.title] = '-';
        row[`${col.title} (Maks)`] = col.max_score;
        row[`${col.title} (%)`] = '-';
        row[`${col.title} (Huruf)`] = '-';
      }
    }
    row['Rata-rata (%)'] = gradedCount > 0 ? Number((totalPct / gradedCount).toFixed(1)) : '-';
    rows.push(row);
  }
  return rows;
}

function optimizedApproach() {
  const rows = [];

  // Pre-calculate column headers
  const colHeaders = columns.map(col => ({
    id: col.id,
    title: col.title,
    maxScore: col.max_score,
    maxScoreLabel: `${col.title} (Maks)`,
    pctLabel: `${col.title} (%)`,
    letterLabel: `${col.title} (Huruf)`,
  }));

  for (const [, student] of studentMap) {
    const row: Record<string, string | number> = {
      Nama: student.name,
      Email: student.email,
    };
    let totalPct = 0;
    let gradedCount = 0;

    for (const col of colHeaders) {
      const entry = student.grades[col.id] ?? null;
      if (entry && entry.score !== null) {
        row[col.title] = entry.score;
        row[col.maxScoreLabel] = col.maxScore;
        row[col.pctLabel] = Number(entry.percentage.toFixed(1));
        row[col.letterLabel] = entry.grade_letter ?? '-';
        totalPct += entry.percentage;
        gradedCount++;
      } else {
        row[col.title] = '-';
        row[col.maxScoreLabel] = col.maxScore;
        row[col.pctLabel] = '-';
        row[col.letterLabel] = '-';
      }
    }
    row['Rata-rata (%)'] = gradedCount > 0 ? Number((totalPct / gradedCount).toFixed(1)) : '-';
    rows.push(row);
  }
  return rows;
}

// Warm up
for (let i = 0; i < 10; i++) {
  originalApproach();
  optimizedApproach();
}

let start = performance.now();
for (let i = 0; i < 50; i++) originalApproach();
let end = performance.now();
const origTime = end - start;
console.log(`Original: ${origTime.toFixed(2)}ms`);

start = performance.now();
for (let i = 0; i < 50; i++) optimizedApproach();
end = performance.now();
const optTime = end - start;
console.log(`Optimized: ${optTime.toFixed(2)}ms`);
console.log(`Improvement: ${((origTime - optTime) / origTime * 100).toFixed(2)}%`);
