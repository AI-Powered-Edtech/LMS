const fs = require('fs');
let content = fs.readFileSync('/workspace/src/features/semester/components/SemesterManager.tsx', 'utf8');

content = content.replace(
  "import { useSemesters } from '../queries/useSemesters'",
  "import { useSemesters } from '../queries/useSemesters'\nimport { useAcademicYears } from '@/features/academic-year/queries/useAcademicYears'"
);

content = content.replace(
  "initial?: Semester\n  onSubmit: (data: SemesterFormData) => void",
  "initial?: Semester\n  academicYearsOptions: { value: string; label: string }[]\n  onSubmit: (data: SemesterFormData) => void"
);

content = content.replace(
  "function SemesterForm({\n  initial,\n  onSubmit,\n  onCancel,\n}: {",
  "function SemesterForm({\n  initial,\n  academicYearsOptions,\n  onSubmit,\n  onCancel,\n}: {"
);

content = content.replace(
  "        <Input\n          value={academicYear}\n          onChange={(e) => setAcademicYear(e.target.value)}\n          placeholder=\"2025/2026\"\n          required\n        />",
  "        <Select\n          value={academicYear}\n          onChange={(e) => setAcademicYear(e.target.value)}\n          options={academicYearsOptions}\n          required\n        />"
);

content = content.replace(
  "const { data: semesters, isLoading } = useSemesters()",
  "const { data: semesters, isLoading } = useSemesters()\n  const { query: ayQuery } = useAcademicYears()\n  const academicYearsOptions = ayQuery.data?.map(ay => ({ value: ay.id, label: ay.name })) ?? []"
);

content = content.replace(
  "          initial={editing ?? undefined}\n          onSubmit={editing ? handleUpdate : handleCreate}",
  "          initial={editing ?? undefined}\n          academicYearsOptions={academicYearsOptions}\n          onSubmit={editing ? handleUpdate : handleCreate}"
);

content = content.replace(
  "<td className=\"py-3 px-2 dark:text-gray-300\">{semester.academic_year_id}</td>",
  "<td className=\"py-3 px-2 dark:text-gray-300\">{ayQuery.data?.find(ay => ay.id === semester.academic_year_id)?.name ?? semester.academic_year_id}</td>"
);

fs.writeFileSync('/workspace/src/features/semester/components/SemesterManager.tsx', content);
