import { performance } from 'perf_hooks';

// Mock data generator
const generateEntries = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    score: i % 3 === 0 ? null : Math.random() * 100, // 1/3 un-graded
    percentage: Math.random() * 100,
  }));
};

const entries = generateEntries(100000);

// Baseline implementation
const runBaseline = () => {
  const graded = entries.filter((e) => e.score != null);
  if (graded.length === 0) return 0;
  return graded.reduce((sum, e) => sum + e.percentage, 0) / graded.length;
};

// Optimized implementation
const runOptimized = () => {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    if (e.score != null) {
      sum += e.percentage;
      count++;
    }
  }
  return count === 0 ? 0 : sum / count;
};

// Warmup
for (let i = 0; i < 100; i++) {
  runBaseline();
  runOptimized();
}

const ITERATIONS = 1000;

const startBaseline = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  runBaseline();
}
const endBaseline = performance.now();

const startOptimized = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  runOptimized();
}
const endOptimized = performance.now();

console.log(`Baseline: ${endBaseline - startBaseline} ms`);
console.log(`Optimized: ${endOptimized - startOptimized} ms`);
