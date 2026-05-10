import { Eye } from "lucide-react";

import { useTheme } from "@/contexts/ThemeContext";

export function HighContrastToggle() {
  const { highContrast, toggleHighContrast } = useTheme();
  return (
    <button
      onClick={toggleHighContrast}
      aria-pressed={highContrast}
      aria-label={
        highContrast ? "Nonaktifkan kontras tinggi" : "Aktifkan kontras tinggi"
      }
      className={[
        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
        "transition-colors duration-200",
        highContrast
          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300",
        "hover:bg-slate-200 dark:hover:bg-slate-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
      ].join(" ")}
    >
      <Eye className="h-4 w-4" aria-hidden="true" />
      <span>Kontras Tinggi</span>
      {highContrast && (
        <span className="ml-1 text-xs bg-yellow-500 text-white px-1.5 py-0.5 rounded-full">
          Aktif
        </span>
      )}
    </button>
  );
}
