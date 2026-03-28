import { Download, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { useState } from 'react'

import { cn } from '@/src/utils/cn'

interface ExportButtonProps {
  data: Record<string, unknown>[]
  filename: string
  format?: 'csv' | 'pdf'
  label?: string
  className?: string
}

export function ExportButton({
  data,
  filename,
  format = 'csv',
  label,
  className,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (data.length === 0) return
    setIsExporting(true)

    try {
      if (format === 'csv') {
        const csv = Papa.unparse(data)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${filename}.csv`
        link.click()
        URL.revokeObjectURL(url)
      } else if (format === 'pdf') {
        window.print()
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={isExporting || data.length === 0}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-all',
        'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50',
        className
      )}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {label ?? (format === 'csv' ? 'Export CSV' : 'Export PDF')}
    </button>
  )
}
