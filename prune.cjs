const fs = require('fs');
const { Project } = require('ts-morph');

const pruneOutput = fs.readFileSync('ts-prune-output.txt', 'utf8');
const lines = pruneOutput.split('\n').filter(l => l.trim() && !l.includes('used in module'));

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

let removedExports = 0;
for (const line of lines) {
  const match = line.match(/^(.+?):(\d+)\s+-\s+(.+)$/);
  if (!match) continue;
  
  const filePath = match[1];
  const exportName = match[3].trim();
  
  // Skip some core files just in case
  if (filePath.endsWith('types/index.ts') || filePath.endsWith('index.ts')) continue;
  if (filePath.includes('builder/index.ts')) continue;
  if (filePath.includes('forumUtils.ts')) continue;
  
  const sf = project.getSourceFile(filePath);
  if (!sf) continue;
  
  // Find the export and remove it
  const exportedDecls = sf.getExportedDeclarations();
  const decls = exportedDecls.get(exportName);
  if (decls) {
    for (const decl of decls) {
      try {
        if (decl.isExported && decl.isExported()) {
          decl.setIsExported(false);
          removedExports++;
        }
      } catch (e) {
        // ignore
      }
    }
  }
}

project.saveSync();
console.log(`Removed ${removedExports} unused exports.`);
