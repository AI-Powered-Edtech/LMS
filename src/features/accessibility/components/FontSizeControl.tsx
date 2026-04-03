import { useTheme } from '@/contexts/ThemeContext'

const SIZES = [
  { value: 'sm' as const, label: 'A-', ariaLabel: 'Kecilkan ukuran teks' },
  { value: 'md' as const, label: 'A', ariaLabel: 'Ukuran teks normal' },
  { value: 'lg' as const, label: 'A+', ariaLabel: 'Perbesar ukuran teks' },
]

export function FontSizeControl() {
  const { fontSize, setFontSize } = useTheme()
  return (
    <div role="group" aria-label="Ukuran teks" className="flex items-center gap-1">
      {SIZES.map((s) => (
        <button
          key={s.value}
          onClick={() => setFontSize(s.value)}
          aria-label={s.ariaLabel}
          aria-pressed={fontSize === s.value}
          className={[
            'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
            fontSize === s.value
              ? 'bg-blue-600 text-white dark:bg-blue-500'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
          ].join(' ')}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
