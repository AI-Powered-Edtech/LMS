import { ChevronDown } from "lucide-react";

import type {
  AssignmentOption,
  ClassOption,
} from "@/features/quizzes/hooks/useQuizGradebookState";

interface QuizGradebookFiltersProps {
  classes: ClassOption[];
  assignments: AssignmentOption[];
  selectedClass: string;
  selectedAssignment: string;
  isAssignmentLoading: boolean;
  onClassChange: (value: string) => void;
  onAssignmentChange: (value: string) => void;
}

export function QuizGradebookFilters({
  classes,
  assignments,
  selectedClass,
  selectedAssignment,
  isAssignmentLoading,
  onClassChange,
  onAssignmentChange,
}: QuizGradebookFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Pilih Kelas
        </label>
        <div className="relative">
          <select
            value={selectedClass}
            onChange={(e) => onClassChange(e.target.value)}
            className="w-full appearance-none px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm pr-10"
          >
            <option value="">-- Pilih kelas --</option>
            {classes.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.name}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
          Pilih Assignment
        </label>
        <div className="relative">
          <select
            value={selectedAssignment}
            onChange={(e) => onAssignmentChange(e.target.value)}
            disabled={
              !selectedClass || isAssignmentLoading || assignments.length === 0
            }
            className="w-full appearance-none px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm pr-10 disabled:opacity-50"
          >
            <option value="">-- Pilih assignment kuis --</option>
            {assignments.map((assignment) => (
              <option key={assignment.id} value={assignment.id}>
                {assignment.title}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}
