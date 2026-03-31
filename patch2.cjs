const fs = require('fs');
let file = fs.readFileSync('src/components/CourseBuilder/LessonBlockEditor.tsx', 'utf8');
file = file.replace(
  "className=\"p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500\"",
  "className=\"p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all disabled:opacity-30 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500\""
);
file = file.replace(
  "className=\"p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500\"",
  "className=\"p-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 rounded-xl transition-all disabled:opacity-30 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500\""
);

fs.writeFileSync('src/components/CourseBuilder/LessonBlockEditor.tsx', file);
