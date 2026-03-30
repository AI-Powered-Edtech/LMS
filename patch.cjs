const fs = require('fs');
let file = fs.readFileSync('src/components/CourseBuilder/LessonBlockEditor.tsx', 'utf8');
file = file.replace(
  "className=\"p-2 md:opacity-0 md:group-hover:opacity-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500\"",
  "className=\"p-2 md:opacity-0 md:group-hover:opacity-100 focus-visible:opacity-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-xl transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500\""
);
fs.writeFileSync('src/components/CourseBuilder/LessonBlockEditor.tsx', file);
