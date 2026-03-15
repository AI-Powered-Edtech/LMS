const { execSync } = require('child_process');
const output = execSync('psql -U postgres -d postgres -c "\\d public.quiz_attempts"', { encoding: 'utf8', env: {...process.env, PGPASSWORD: 'postgres'} });
console.log(output);
