const fs = require('fs');
const report = JSON.parse(fs.readFileSync('eslint-report.json', 'utf8'));

report.forEach(file => {
  const unused = file.messages.filter(m => m.ruleId === 'no-unused-vars' || m.ruleId === '@typescript-eslint/no-unused-vars');
  if (unused.length === 0) return;

  let content = fs.readFileSync(file.filePath, 'utf8');
  let lines = content.split('\n');

  // Process from bottom to top to keep line numbers valid
  unused.sort((a, b) => b.line - a.line).forEach(m => {
    const lineIdx = m.line - 1;
    let line = lines[lineIdx];
    const match = m.message.match(/'([^']+)' is (defined|assigned a value) but never used/);
    if (!match) return;
    const varName = match[1];

    // If it's an import line
    if (line.includes('import ') && line.includes(varName)) {
      // try to remove the variable from import
      const regex = new RegExp(`\\b${varName}\\b\\s*,?`, 'g');
      line = line.replace(regex, '');
      // cleanup empty curly braces
      line = line.replace(/\{\s*\}/, '');
      // if import is empty now, remove the line
      if (line.match(/^import\s*(type\s*)?['"][^']+['"];?$/)) {
        lines.splice(lineIdx, 1);
      } else if (line.match(/^import\s+from\s+['"][^']+['"];?$/)) {
        lines.splice(lineIdx, 1);
      } else {
        lines[lineIdx] = line;
      }
    } else {
      // If it's a function argument or variable, replace with _varName
      const regex = new RegExp(`\\b${varName}\\b`, 'g');
      lines[lineIdx] = line.replace(regex, `_${varName}`);
    }
  });

  fs.writeFileSync(file.filePath, lines.join('\n'));
  console.log(`Fixed ${file.filePath}`);
});
