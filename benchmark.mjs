import { performance } from 'perf_hooks';

// Simulate students array
const numStudents = 10000;
const students = Array.from({ length: numStudents }).map((_, i) => ({
  id: `student_${i}`,
  name: `Student Name ${i}`,
  email: `student${i}@example.com`,
  grades: {},
  average: 85,
}));

// Simulate search term
const search = "Name 99";

function benchmarkUnoptimized() {
  const start = performance.now();
  const filtered = search.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.email.toLowerCase().includes(search.toLowerCase())
      )
    : students;
  const end = performance.now();
  return { time: end - start, resultCount: filtered.length };
}

function benchmarkOptimized() {
  const start = performance.now();
  const trimmedSearch = search.trim();
  const lowerSearch = trimmedSearch.toLowerCase();
  const filtered = trimmedSearch
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(lowerSearch) ||
          s.email.toLowerCase().includes(lowerSearch)
      )
    : students;
  const end = performance.now();
  return { time: end - start, resultCount: filtered.length };
}

// Warmup
for (let i = 0; i < 100; i++) {
  benchmarkUnoptimized();
  benchmarkOptimized();
}

let unoptimizedTotal = 0;
let optimizedTotal = 0;
const iterations = 1000;

for (let i = 0; i < iterations; i++) {
  unoptimizedTotal += benchmarkUnoptimized().time;
  optimizedTotal += benchmarkOptimized().time;
}

console.log(`Unoptimized Average Time: ${unoptimizedTotal / iterations} ms`);
console.log(`Optimized Average Time:   ${optimizedTotal / iterations} ms`);
console.log(`Speedup:                  ${((unoptimizedTotal - optimizedTotal) / unoptimizedTotal * 100).toFixed(2)}%`);
