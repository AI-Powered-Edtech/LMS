const { Project } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const entryPoints = [
  'src/main.tsx',
  'src/index.tsx',
  'src/vite-env.d.ts',
  'src/setupTests.ts',
  'src/App.tsx'
];

const sourceFiles = project.getSourceFiles();

const unusedFiles = [];
for (const sf of sourceFiles) {
  const filePath = sf.getFilePath();
  if (!filePath.includes('/src/')) continue;
  if (filePath.includes('__tests__') || filePath.includes('.test.') || filePath.includes('.spec.')) continue;
  if (filePath.endsWith('.stories.tsx')) continue;
  if (entryPoints.some(ep => filePath.endsWith(ep))) continue;

  const incoming = sf.getReferencingNodesInOtherSourceFiles();
  if (incoming.length === 0) {
    unusedFiles.push(filePath);
  }
}

console.log('Unused Files:');
console.log(unusedFiles.join('\n'));
