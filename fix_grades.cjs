const fs = require('fs');
let code = fs.readFileSync('src/pages/Grades.tsx', 'utf8');
code = code.replace(
  /const { data, error } = await supabase[\s\S]*?return data \?\? \[\]/,
  'return await gradebookService.getStudentGrades(user.id, tenantId)'
);
fs.writeFileSync('src/pages/Grades.tsx', code);
