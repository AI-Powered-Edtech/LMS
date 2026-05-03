const fs = require('fs');

let content = fs.readFileSync('vitest.config.ts', 'utf8');

if (!content.includes('coverage:')) {
    content = content.replace('test: {', `test: {\n    coverage: {\n      reporter: ['text', 'json', 'html', 'json-summary'],\n    },`);
    fs.writeFileSync('vitest.config.ts', content);
}
