import { Sparkles } from 'lucide-react'

interface CopilotLoadingStateProps {
  message?: string
}

export function CopilotLoadingState({
  message = 'Menghasilkan konten...',
}: CopilotLoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6" aria-live="polite">
      <div className="relative mb-4">
        <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-indigo-500 dark:text-indigo-400 animate-pulse" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
      </div>
      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-pulse">
        {message}
      </p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Harap tunggu beberapa saat</p>
    </div>
  )
}
