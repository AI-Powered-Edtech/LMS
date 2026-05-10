import type { ConditionType } from "../types";

interface PathConditionPickerProps {
  value: ConditionType;
  onChange: (v: ConditionType) => void;
  disabled?: boolean;
}

const CONDITION_LABELS: Record<ConditionType, string> = {
  quiz_score_below: "Nilai kuis di bawah threshold",
  quiz_score_above: "Nilai kuis di atas threshold",
  time_spent_below: "Waktu belajar kurang dari minimum",
  assignment_score_below: "Nilai tugas di bawah threshold",
  lesson_not_completed: "Pelajaran belum diselesaikan",
  always: "Selalu (tanpa kondisi)",
};

const ALL_CONDITIONS: ConditionType[] = [
  "quiz_score_below",
  "quiz_score_above",
  "time_spent_below",
  "assignment_score_below",
  "lesson_not_completed",
  "always",
];

export function PathConditionPicker({
  value,
  onChange,
  disabled,
}: PathConditionPickerProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ConditionType)}
      disabled={disabled}
      className="w-full px-3 py-2.5 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 dark:focus:border-indigo-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {ALL_CONDITIONS.map((cond) => (
        <option key={cond} value={cond}>
          {CONDITION_LABELS[cond]}
        </option>
      ))}
    </select>
  );
}

export { CONDITION_LABELS };
