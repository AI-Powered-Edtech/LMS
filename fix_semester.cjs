const fs = require('fs');
let content = fs.readFileSync('/workspace/src/features/semester/components/SemesterManager.tsx', 'utf8');

content = content.replace(
  "ayQuery.data?.map(ay =>",
  "ayQuery.data?.map((ay: any) =>"
);

content = content.replace(
  "ayQuery.data?.find(ay =>",
  "ayQuery.data?.find((ay: any) =>"
);

content = content.replace(
  "<SemesterForm\n          initial={editing ?? undefined}\n          onSubmit={editing ? handleUpdate : handleCreate}",
  "<SemesterForm\n          initial={editing ?? undefined}\n          academicYearsOptions={academicYearsOptions}\n          onSubmit={editing ? handleUpdate : handleCreate}"
);

fs.writeFileSync('/workspace/src/features/semester/components/SemesterManager.tsx', content);
