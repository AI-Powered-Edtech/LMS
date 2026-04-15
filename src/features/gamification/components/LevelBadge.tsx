interface LevelBadgeProps {
  level: number
  size?: 'sm' | 'md'
}

function getLevelTier(level: number): { label: string; color: string } {
  if (level >= 13)
    return {
      label: 'Master',
      color: 'bg-gradient-to-r from-yellow-400 to-amber-500 shadow-amber-200/50',
    }
  if (level >= 8)
    return {
      label: 'Cendekia',
      color: 'bg-gradient-to-r from-purple-500 to-violet-600 shadow-purple-200/50',
    }
  if (level >= 4)
    return {
      label: 'Penjelajah',
      color: 'bg-gradient-to-r from-blue-500 to-cyan-500 shadow-blue-200/50',
    }
  return {
    label: 'Pemula',
    color: 'bg-gradient-to-r from-slate-400 to-slate-500 shadow-slate-200/50',
  }
}

export function LevelBadge({ level, size = 'sm' }: LevelBadgeProps) {
  const { color } = getLevelTier(level)

  const sizeClasses = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[10px]'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-bold text-white shadow-sm ${color} ${sizeClasses}`}
      title={`Level ${level} — ${getLevelTier(level).label}`}
    >
      Lv {level}
    </span>
  )
}

export { getLevelTier }
