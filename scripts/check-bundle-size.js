#!/usr/bin/env node

/**
 * Bundle Size Check Script
 * ========================
 * Parses dist/assets/*.js files after a Vite build and enforces gzipped size budgets.
 *
 * Usage:
 *   node scripts/check-bundle-size.js
 *
 * Exit codes:
 *   0 — all chunks within budget
 *   1 — one or more chunks exceed budget
 *   2 — dist directory not found (build required first)
 *
 * Budgets (gzipped KB):
 *   main (index-*.js)        — 250 KB
 *   vendor-react             — 80 KB
 *   vendor-supabase          — 100 KB
 *   total initial JS         — 400 KB
 *   any single lazy chunk    — 150 KB
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST_ASSETS = join(process.cwd(), 'dist', 'assets');

// -------------------------------------------------------------------
// Budgets (gzipped kilobytes)
// -------------------------------------------------------------------
const BUDGETS = {
  main: 250,
  'vendor-react': 80,
  'vendor-supabase': 100,
  totalInitial: 400,
  lazySingle: 150,
};

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------
function gzipSizeKB(filePath) {
  const raw = readFileSync(filePath);
  const compressed = gzipSync(raw, { level: 9 });
  return compressed.length / 1024;
}

function formatKB(kb) {
  return `${kb.toFixed(1)} KB`;
}

function findFiles(dir, pattern) {
  try {
    return readdirSync(dir)
      .filter((f) => pattern.test(f))
      .map((f) => join(dir, f));
  } catch {
    return [];
  }
}

// Pick the largest match (when Vite produces multiple index-*.js shims + a real chunk)
function largestFile(files) {
  if (files.length === 0) return null;
  return files.reduce((a, b) => (statSync(a).size > statSync(b).size ? a : b));
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
function main() {
  // Verify dist exists
  try {
    statSync(DIST_ASSETS);
  } catch {
    console.error('ERROR: dist/assets/ not found. Run "pnpm build" first.');
    process.exit(2);
  }

  const allJs = findFiles(DIST_ASSETS, /\.js$/);
  if (allJs.length === 0) {
    console.error('ERROR: No JS files found in dist/assets/.');
    process.exit(2);
  }

  // Categorise chunks
  const mainFiles = allJs.filter((f) => /^index-/.test(basename(f)));
  const reactFiles = allJs.filter((f) => /^vendor-react-/.test(basename(f)));
  const supabaseFiles = allJs.filter((f) => /^vendor-supabase-/.test(basename(f)));

  const mainFile = largestFile(mainFiles);
  const reactFile = largestFile(reactFiles);
  const supabaseFile = largestFile(supabaseFiles);

  // Lazy chunks = everything that is NOT main / vendor-react / vendor-supabase
  const initialFiles = new Set([mainFile, reactFile, supabaseFile].filter(Boolean));
  const lazyFiles = allJs.filter((f) => !initialFiles.has(f));

  // Measure gzipped sizes
  const mainGz = mainFile ? gzipSizeKB(mainFile) : 0;
  const reactGz = reactFile ? gzipSizeKB(reactFile) : 0;
  const supabaseGz = supabaseFile ? gzipSizeKB(supabaseFile) : 0;
  const totalInitialGz = mainGz + reactGz + supabaseGz;

  let failed = false;

  function check(label, sizeKB, budgetKB) {
    const ok = sizeKB <= budgetKB;
    const status = ok ? 'OK' : 'OVER';
    const icon = ok ? '\u2714' : '\u2718';
    console.log(
      `  ${icon}  ${label.padEnd(22)} ${formatKB(sizeKB).padStart(10)}  /  ${formatKB(budgetKB).padStart(10)}   ${status}`
    );
    if (!ok) failed = true;
  }

  console.log('');
  console.log('Bundle Size Report (gzipped)');
  console.log('='.repeat(68));
  console.log('');

  check('main', mainGz, BUDGETS.main);
  check('vendor-react', reactGz, BUDGETS['vendor-react']);
  check('vendor-supabase', supabaseGz, BUDGETS['vendor-supabase']);
  check('total-initial', totalInitialGz, BUDGETS.totalInitial);

  console.log('');

  // Check lazy chunks individually
  if (lazyFiles.length > 0) {
    console.log(`Lazy chunks (${lazyFiles.length} files, budget ${formatKB(BUDGETS.lazySingle)} each):`);
    const lazyResults = lazyFiles
      .map((f) => ({ name: basename(f), gz: gzipSizeKB(f) }))
      .sort((a, b) => b.gz - a.gz);

    // Show top 5 largest, plus any over budget
    const shown = new Set();
    const overBudget = lazyResults.filter((r) => r.gz > BUDGETS.lazySingle);
    const top5 = lazyResults.slice(0, 5);

    for (const r of [...overBudget, ...top5]) {
      if (shown.has(r.name)) continue;
      shown.add(r.name);
      check(r.name.slice(0, 22), r.gz, BUDGETS.lazySingle);
    }

    if (lazyResults.length > shown.size) {
      console.log(`  ... and ${lazyResults.length - shown.size} more chunks (all within budget)`);
    }
  }

  console.log('');
  console.log('='.repeat(68));

  if (failed) {
    console.log('FAIL: One or more chunks exceed their budget.');
    console.log('Review chunking configuration in vite.config.ts.');
    process.exit(1);
  } else {
    console.log('PASS: All chunks within budget.');
    process.exit(0);
  }
}

main();
