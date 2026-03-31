import { Download, Loader2 } from 'lucide-react'
import Papa from 'papaparse'
import { useState } from 'react'

import { cn } from '@/utils/cn'
import { escapeHtml } from '@/utils/sanitize'

function exportAsPrintablePDF(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const columns = Object.keys(data[0])
  const rows = data.map((row) => columns.map((col) => escapeHtml(String(row[col] ?? ''))))

  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return

  w.document.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <title>${escapeHtml(filename)}</title>
  <style>
    @page { margin: 1cm; }
    body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; }
    h1 { font-size: 16px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f1f5f9; text-align: left; padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600; }
    td { padding: 5px 8px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
    @media print { button { display: none; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(filename)}</h1>
  <table>
    <thead><tr>${columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
  <br>
  <button onclick="window.print();window.close()">Cetak / Simpan PDF</button>
</body>
</html>`)
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
  }, 300)
}

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
        exportAsPrintablePDF(data, filename)
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
