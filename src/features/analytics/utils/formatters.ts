/**
 * SP-12.3: Formatting utilities for the Teacher Analytics Dashboard.
 * All user-facing text is in Indonesian (Bahasa Indonesia).
 */

export function formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}d`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return secs > 0 ? `${mins}m ${secs}d` : `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return remainMins > 0 ? `${hrs}j ${remainMins}m` : `${hrs}j`;
}

export function formatPct(value: number | null | undefined): string {
    if (value == null) return '-';
    return `${Math.round(value * 10) / 10}%`;
}

export function relativeTime(dateStr: string | null): string {
    if (!dateStr) return '-';
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Baru saja';
    if (diffMin < 60) return `${diffMin} menit lalu`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} jam lalu`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} hari lalu`;
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

export function pctColor(value: number): string {
    if (value >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (value >= 50) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
}

export function pctBgColor(value: number): string {
    if (value >= 80) return 'bg-emerald-500';
    if (value >= 50) return 'bg-amber-500';
    return 'bg-red-500';
}

export function struggleColor(score: number): { text: string; bg: string; label: string } {
    if (score >= 5) return { text: 'text-red-700 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30', label: 'Risiko Tinggi' };
    if (score >= 3) return { text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30', label: 'Kesulitan' };
    return { text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30', label: 'Normal' };
}
