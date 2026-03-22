import { cn } from '@/src/utils/cn'

interface OnboardingFormProps {
  onSubmit: (data: Record<string, string>) => void
  isLoading?: boolean
  className?: string
}

/**
 * Form untuk membuat/mengedit Onboarding.
 */
export function OnboardingForm({ onSubmit, isLoading, className }: OnboardingFormProps) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const data: Record<string, string> = {}
    formData.forEach((value, key) => {
      data[key] = String(value)
    })
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-4', className)}>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Nama
        </label>
        <input
          name="name"
          type="text"
          required
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-sm',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
          Deskripsi
        </label>
        <textarea
          name="description"
          rows={3}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl border text-sm resize-none',
            'border-slate-200 dark:border-slate-700',
            'bg-white dark:bg-slate-900',
            'text-slate-900 dark:text-white',
            'focus:outline-none focus:ring-2 focus:ring-blue-500'
          )}
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className={cn(
          'w-full py-2.5 rounded-xl text-sm font-medium text-white',
          'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors'
        )}
      >
        {isLoading ? 'Menyimpan...' : 'Simpan'}
      </button>
    </form>
  )
}
