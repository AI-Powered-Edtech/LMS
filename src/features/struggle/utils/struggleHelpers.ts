// ----------------------------------------------------------------
// Format relative time in Indonesian
// ----------------------------------------------------------------
export function relativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'Baru saja'
  if (mins < 60) return `${mins} menit lalu`
  const hours = Math.round(diff / 3_600_000)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(diff / 86_400_000)
  return `${days} hari lalu`
}
