const fs = require('fs');
const glob = require('glob');

const mdFiles = glob.sync('**/*.md', { ignore: ['node_modules/**', '.git/**'] });

mdFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // 1. Update Feature Module Counts & Lists
  content = content.replace(/24 feature module/g, '49 feature module');
  content = content.replace(/32 feature module/g, '49 feature module');
  content = content.replace(/32 feature modules/g, '49 feature modules');
  content = content.replace(/32 Feature Modules/g, '49 Feature Modules');
  content = content.replace(/24 modules in/g, '49 modules in');
  content = content.replace(/24\+ feature modules/gi, '49 feature modules');
  
  // 2. Update Edge Function Registry
  content = content.replace(/23 Edge Functions/g, '28 Edge Functions');
  content = content.replace(/23 Deno Edge Functions/g, '28 Deno Edge Functions');
  content = content.replace(/23 edge functions/g, '28 edge functions');
  content = content.replace(/23 fungsi/g, '28 fungsi');
  
  // 3. Fix Broken Links & Migration Counts
  content = content.replace(/259 migration files/g, '133 migration files');
  content = content.replace(/DATABASE\.md/g, 'DATABASE_ARCHITECTURE.md');
  // Fix the path if it was docs/DATABASE.md -> docs/DATABASE_ARCHITECTURE.md
  content = content.replace(/\[docs\/DATABASE_ARCHITECTURE\.md\]\(docs\/DATABASE_ARCHITECTURE\.md\)/g, '[docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md)');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});
