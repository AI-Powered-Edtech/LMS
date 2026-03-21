#!/usr/bin/env node
/**
 * EduSync LMS — Feature Health Scorer
 *
 * Scans src/features/ and scores each feature module on 3 dimensions:
 *   1. Completeness  — folder structure + test presence
 *   2. Dokumentasi   — README + doc references
 *   3. UI/UX Quality — dark mode, skeleton screens
 *
 * Then pushes results to the Notion "EduSync — Feature Health Tracker" database.
 *
 * Usage:
 *   NOTION_TOKEN=secret_xxx NOTION_DATABASE_ID=xxx node scripts/score-features.js
 *
 * Required env vars:
 *   NOTION_TOKEN        — Notion integration token (secret_...)
 *   NOTION_DATABASE_ID  — ID of the Feature Health Tracker database
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Config ──────────────────────────────────────────────────────────────────
const ROOT          = path.resolve(__dirname, '..');
const FEATURES_DIR  = path.join(ROOT, 'src', 'features');
const DOCS_DIR      = path.join(ROOT, 'docs');
const NOTION_TOKEN  = process.env.NOTION_TOKEN;
const DATABASE_ID   = process.env.NOTION_DATABASE_ID;
const TODAY         = new Date().toISOString().split('T')[0];

// Domain mapping: feature folder name → Notion Domain option
const DOMAIN_MAP = {
  'administration':  'Admin',
  'ai-tutor':        'Learning',
  'analytics':       'Analytics',
  'announcements':   'Communication',
  'assignments':     'Assessment',
  'calendar':        'Academic',
  'classroom':       'Academic',
  'courses':         'Academic',
  'dashboards':      'Analytics',
  'discussions':     'Communication',
  'gamification':    'Engagement',
  'gradebook':       'Assessment',
  'guidance':        'Admin',
  'lessons':         'Learning',
  'moderation':      'Admin',
  'notifications':   'Communication',
  'onboarding':      'Admin',
  'progress':        'Learning',
  'question-bank':   'Assessment',
  'quizzes':         'Assessment',
  'recommendations': 'Learning',
  'reports':         'Analytics',
  'storage':         'Infrastructure',
  'struggle':        'Analytics',
};

// Display name overrides
const NAME_MAP = {
  'ai-tutor':        'AI Tutor',
  'question-bank':   'Question Bank',
  'struggle':        'Struggle Detection',
  'progress':        'Progress Tracking',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function countFilesMatching(dir, pattern) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (pattern.test(entry.name)) count++;
    }
  };
  walk(dir);
  return count;
}

function grepCount(dir, pattern) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  const walk = (d) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          if (pattern.test(content)) count++;
        } catch {}
      }
    }
  };
  walk(dir);
  return count;
}

function countDocRefs(featureName) {
  if (!fs.existsSync(DOCS_DIR)) return 0;
  const searchTerms = [featureName, featureName.replace(/-/g, ' ')];
  let count = 0;
  for (const file of fs.readdirSync(DOCS_DIR)) {
    if (!file.endsWith('.md')) continue;
    try {
      const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8').toLowerCase();
      if (searchTerms.some(t => content.includes(t.toLowerCase()))) count++;
    } catch {}
  }
  return count;
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

function scoreFeature(featureName) {
  const featurePath = path.join(FEATURES_DIR, featureName);

  // — Completeness —
  const hasApi        = fs.existsSync(path.join(featurePath, 'api'));
  const hasHooks      = fs.existsSync(path.join(featurePath, 'hooks'));
  const hasTypes      = fs.existsSync(path.join(featurePath, 'types'));
  const hasComponents = fs.existsSync(path.join(featurePath, 'components'));
  const hasQueries    = fs.existsSync(path.join(featurePath, 'queries'));
  const hasTests      = countFilesMatching(featurePath, /\.test\.(ts|tsx)$/) > 0;

  const completeness =
    (hasApi        ? 20 : 0) +
    (hasHooks      ? 15 : 0) +
    (hasTypes      ? 15 : 0) +
    (hasComponents ? 20 : 0) +
    (hasQueries    ? 15 : 0) +
    (hasTests      ? 15 : 0);

  // — Dokumentasi —
  const hasReadme   = fs.existsSync(path.join(featurePath, 'README.md'));
  const docRefs     = countDocRefs(featureName);
  const dokumentasi = Math.min(100, (hasReadme ? 30 : 0) + Math.min(70, docRefs * 2));

  // — UI/UX Quality —
  const darkModeFiles = grepCount(featurePath, /\bdark:/);
  const skeletonFiles = grepCount(featurePath, /[Ss]keleton/);
  const uiux = Math.min(100,
    20 +
    Math.min(50, darkModeFiles * 5) +
    Math.min(30, skeletonFiles * 8)
  );

  // — Total & Status —
  const total  = Math.round((completeness + dokumentasi + uiux) / 3);
  const status = total >= 75 ? 'Complete' : total >= 35 ? 'In Progress' : 'Needs Work';

  // — Catatan (auto-generated gaps) —
  const gaps = [];
  if (!hasApi)             gaps.push('api/');
  if (!hasHooks)           gaps.push('hooks/');
  if (!hasTypes)           gaps.push('types/');
  if (!hasComponents)      gaps.push('components/');
  if (!hasQueries)         gaps.push('queries/');
  if (!hasTests)           gaps.push('tests');
  if (!hasReadme)          gaps.push('README.md');
  if (darkModeFiles === 0) gaps.push('dark mode');
  if (skeletonFiles === 0) gaps.push('skeleton');

  const catatan = gaps.length === 0
    ? 'Semua dimensi terpenuhi ✓'
    : `Kurang: ${gaps.join(', ')}`;

  return {
    name: NAME_MAP[featureName] ?? (featureName.charAt(0).toUpperCase() + featureName.slice(1)),
    domain: DOMAIN_MAP[featureName] ?? 'Admin',
    completeness,
    dokumentasi,
    uiux,
    total,
    status,
    catatan,
  };
}

// ─── Notion API ───────────────────────────────────────────────────────────────

async function notionRequest(method, endpoint, body) {
  const res = await fetch(`https://api.notion.com/v1${endpoint}`, {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API ${method} ${endpoint} → ${res.status}: ${err}`);
  }
  return res.json();
}

async function getExistingPages() {
  const pages = {};
  let cursor = undefined;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    const data = await notionRequest('POST', `/databases/${DATABASE_ID}/query`, body);
    for (const page of data.results) {
      const title = page.properties['Fitur']?.title?.[0]?.plain_text;
      if (title) pages[title] = page.id;
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

function buildNotionProperties(score) {
  return {
    'Fitur':         { title:     [{ text: { content: score.name } }] },
    'Domain':        { select:    { name: score.domain } },
    'Status':        { select:    { name: score.status } },
    'Completeness':  { number:    score.completeness },
    'Dokumentasi':   { number:    score.dokumentasi },
    'UI/UX Quality': { number:    score.uiux },
    'Skor Total':    { number:    score.total },
    'Catatan':       { rich_text: [{ text: { content: score.catatan } }] },
    'Last Synced':   { date:      { start: TODAY } },
  };
}

async function upsertPage(pageId, score) {
  const properties = buildNotionProperties(score);
  if (pageId) {
    await notionRequest('PATCH', `/pages/${pageId}`, { properties });
    console.log(`  ✓ Updated: ${score.name.padEnd(22)} ${score.total}/100 — ${score.status}`);
  } else {
    await notionRequest('POST', '/pages', {
      parent: { database_id: DATABASE_ID },
      properties,
    });
    console.log(`  + Created: ${score.name.padEnd(22)} ${score.total}/100 — ${score.status}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!NOTION_TOKEN || !DATABASE_ID) {
    console.error('ERROR: NOTION_TOKEN and NOTION_DATABASE_ID must be set.');
    process.exit(1);
  }

  console.log('\n🔍 EduSync Feature Health Scorer');
  console.log('================================');
  console.log(`Date      : ${TODAY}`);
  console.log(`Features  : ${FEATURES_DIR}\n`);

  const features = fs.readdirSync(FEATURES_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  console.log(`Found ${features.length} feature modules.\n`);

  const scores = features.map(f => {
    const score = scoreFeature(f);
    const icon = score.status === 'Complete' ? '✅' : score.status === 'In Progress' ? '🔄' : '❌';
    console.log(`  ${icon} ${score.name.padEnd(22)} C:${String(score.completeness).padStart(3)} D:${String(score.dokumentasi).padStart(3)} U:${String(score.uiux).padStart(3)} → ${score.total}/100`);
    return score;
  });

  console.log('\n📡 Fetching existing Notion pages...');
  const existingPages = await getExistingPages();
  console.log(`Found ${Object.keys(existingPages).length} existing pages.\n`);

  console.log('📝 Syncing to Notion...');
  for (const score of scores) {
    const pageId = existingPages[score.name] ?? null;
    await upsertPage(pageId, score);
    await new Promise(r => setTimeout(r, 350)); // Notion rate limit ~3 req/sec
  }

  const complete   = scores.filter(s => s.status === 'Complete').length;
  const inProgress = scores.filter(s => s.status === 'In Progress').length;
  const needsWork  = scores.filter(s => s.status === 'Needs Work').length;
  const avgTotal   = Math.round(scores.reduce((a, s) => a + s.total, 0) / scores.length);

  console.log('\n📊 Summary');
  console.log('==========');
  console.log(`  ✅ Complete:    ${complete}`);
  console.log(`  🔄 In Progress: ${inProgress}`);
  console.log(`  ❌ Needs Work:  ${needsWork}`);
  console.log(`  📈 Avg Score:   ${avgTotal}/100`);
  console.log('\n✅ Notion sync complete.\n');
}

main().catch(err => {
  console.error('\nFATAL:', err.message);
  process.exit(1);
});
