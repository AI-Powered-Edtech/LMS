const fs = require('fs');
const content = fs.readFileSync('src/shared/config/navigation.ts', 'utf8');
const ids = content.match(/id:\s*'([^']+)'/g);
console.log(ids.map(s => s.split("'")[1]).reduce((acc, id) => {
  acc[id] = (acc[id] || 0) + 1;
  return acc;
}, {}));
