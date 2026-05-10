import { cn } from "@/utils/cn";

interface DiffPreviewProps {
  original: string;
  transformed: string;
}

export function DiffPreview({ original, transformed }: DiffPreviewProps) {
  const origLines = original.split("\n");
  const transLines = transformed.split("\n");

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-mono">
      <div className="grid grid-cols-2 text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
        <div className="px-3 py-2 text-red-500">Asli</div>
        <div className="px-3 py-2 text-emerald-500 border-l border-slate-200 dark:border-slate-700">
          Hasil
        </div>
      </div>
      <div className="grid grid-cols-2 max-h-64 overflow-y-auto">
        <div className="px-3 py-2 bg-red-50/50 dark:bg-red-950/20 border-r border-slate-200 dark:border-slate-700">
          {origLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "py-0.5 leading-relaxed break-words",
                "text-slate-600 dark:text-slate-400",
              )}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>
        <div className="px-3 py-2 bg-emerald-50/50 dark:bg-emerald-950/20">
          {transLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "py-0.5 leading-relaxed break-words",
                "text-slate-700 dark:text-slate-300",
              )}
            >
              {line || "\u00A0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
