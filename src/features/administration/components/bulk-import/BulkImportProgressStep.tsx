import { Loader2 } from 'lucide-react'

interface BulkImportProgressStepProps {
  progress: number
  chunkStatus: string
}

export function BulkImportProgressStep({ progress, chunkStatus }: BulkImportProgressStepProps) {
  return (
    <div className="text-center py-8">
      <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
      <p className="font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Sedang memproses impor...
      </p>
      {chunkStatus && (
        <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">{chunkStatus}</p>
      )}
      {!chunkStatus && <div className="mb-4" />}
      <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden max-w-sm mx-auto">
        <div
          className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{progress}% selesai</p>
    </div>
  )
}
