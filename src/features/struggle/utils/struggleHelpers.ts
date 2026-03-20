// ----------------------------------------------------------------
// Severity color tokens
// ----------------------------------------------------------------
export interface SeverityColors {
  bg: string;
  text: string;
  border: string;
  icon: string;
}

export function severityColors(
  severity: 'low' | 'medium' | 'high',
): SeverityColors {
  switch (severity) {
    case 'high':
      return {
        bg: 'bg-red-50 dark:bg-red-950/30',
        text: 'text-red-700 dark:text-red-400',
        border: 'border-red-300 dark:border-red-700',
        icon: 'text-red-500 dark:text-red-400',
      };
    case 'medium':
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-400',
        border: 'border-amber-300 dark:border-amber-700',
        icon: 'text-amber-500 dark:text-amber-400',
      };
    case 'low':
    default:
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-950/30',
        text: 'text-emerald-700 dark:text-emerald-400',
        border: 'border-emerald-300 dark:border-emerald-700',
        icon: 'text-emerald-500 dark:text-emerald-400',
      };
  }
}

// ----------------------------------------------------------------
// Human-readable severity labels (Indonesian)
// ----------------------------------------------------------------
export function severityLabel(severity: string): string {
  switch (severity) {
    case 'high':
      return 'Butuh Bantuan';
    case 'medium':
      return 'Perlu Perhatian';
    case 'low':
    default:
      return 'Normal';
  }
}

// ----------------------------------------------------------------
// Scale integer score 0-11 to percentage 0-100 for display bars
// ----------------------------------------------------------------
export function scoreToPercent(score: number): number {
  return Math.round(Math.min((score / 11) * 100, 100));
}

// ----------------------------------------------------------------
// Format relative time in Indonesian
// ----------------------------------------------------------------
export function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.round(diff / 3_600_000);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.round(diff / 86_400_000);
  return `${days} hari lalu`;
}
