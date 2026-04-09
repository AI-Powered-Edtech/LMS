const fs = require('fs');
const path = require('path');

function getMdFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'dev-dist') continue;
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getMdFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const mdFiles = getMdFiles(__dirname);

mdFiles.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // 1. Update Feature Module Counts & Lists
  content = content.replace(/24 feature module/gi, '49 feature module');
  content = content.replace(/32 feature module/gi, '49 feature module');
  content = content.replace(/32 feature modules/gi, '49 feature modules');
  content = content.replace(/32 Feature Modules/gi, '49 Feature Modules');
  content = content.replace(/24 modules in/gi, '49 modules in');
  content = content.replace(/32 domain-based modules/gi, '49 domain-based modules');
  content = content.replace(/Feature Modules \(32\)/g, 'Feature Modules (49)');
  
  // 2. Update Edge Function Registry
  content = content.replace(/23 Edge Functions/gi, '28 Edge Functions');
  content = content.replace(/23 Deno Edge Functions/gi, '28 Deno Edge Functions');
  content = content.replace(/23 edge functions/gi, '28 edge functions');
  content = content.replace(/23 fungsi/gi, '28 fungsi');
  
  // 3. Fix Broken Links & Migration Counts
  content = content.replace(/259 migration files/gi, '133 migration files');
  content = content.replace(/DATABASE\.md/g, 'DATABASE_ARCHITECTURE.md');
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  }
});