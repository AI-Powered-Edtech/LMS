import { performance } from 'perf_hooks';

// Simulate quizService methods with 50ms latency
const quizService = {
  updateQuizQuestion: async (id, data, tenantId) => {
    return new Promise((resolve) => setTimeout(resolve, 50));
  },
  replaceQuestionOptions: async (id, tenantId, options) => {
    return new Promise((resolve) => setTimeout(resolve, 50));
  }
};

const tenantId = 'tenant-1';

// Generate 20 existing questions
const existingQs = Array.from({ length: 20 }, (_, i) => ({
  id: `q-${i}`,
  text: `Question ${i}`,
  question_type: 'MCQ',
  points: 10,
  explanation: `Explanation ${i}`,
  order: i,
  options: [
    { text: 'A', is_correct: true },
    { text: 'B', is_correct: false }
  ]
}));

async function benchmarkSequential() {
  const start = performance.now();

  for (const q of existingQs) {
    await quizService.updateQuizQuestion(
      q.id,
      {
        text: q.text,
        question_type: q.question_type,
        points: q.points,
        explanation: q.explanation,
        order: q.order,
      },
      tenantId
    );
    await quizService.replaceQuestionOptions(
      q.id,
      tenantId,
      q.options.map((o) => ({ text: o.text, is_correct: o.is_correct }))
    );
  }

  const end = performance.now();
  console.log(`Sequential execution time: ${(end - start).toFixed(2)}ms`);
}

async function benchmarkParallel() {
  const start = performance.now();

  await Promise.all(
    existingQs.map(async (q) => {
      await quizService.updateQuizQuestion(
        q.id,
        {
          text: q.text,
          question_type: q.question_type,
          points: q.points,
          explanation: q.explanation,
          order: q.order,
        },
        tenantId
      );
      await quizService.replaceQuestionOptions(
        q.id,
        tenantId,
        q.options.map((o) => ({ text: o.text, is_correct: o.is_correct }))
      );
    })
  );

  const end = performance.now();
  console.log(`Parallel execution time: ${(end - start).toFixed(2)}ms`);
}

async function runBenchmarks() {
  console.log('Running benchmarks for updating 20 questions...');
  console.log('(Each operation simulated with 50ms latency)');
  await benchmarkSequential();
  await benchmarkParallel();
}

runBenchmarks();
