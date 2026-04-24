/**
 * CSV export helper for tabular data.
 *
 * - Produces UTF-8 CSV with BOM so Excel opens Unicode correctly.
 * - Escapes fields containing commas, double-quotes, or newlines per RFC 4180.
 * - Null / undefined values render as empty strings.
 * - Pure serialization lives in `rowsToCsv` for easy testing; `exportCsv`
 *   triggers the browser download via Blob + anchor click.
 */

export interface CsvColumn {
  key: string
  label?: string
}

const UTF8_BOM = '\uFEFF'

function escapeField(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'string' ? value : String(value)
  const needsQuoting = /[",\n\r]/.test(str)
  if (!needsQuoting) return str
  return `"${str.replace(/"/g, '""')}"`
}

/**
 * Pure: serialize rows to a CSV string (with UTF-8 BOM prefix).
 * Throws if rows is empty — callers must handle the empty case.
 */
export function rowsToCsv(
  rows: Record<string, unknown>[],
  columns?: CsvColumn[]
): string {
  if (!rows.length) {
    throw new Error('No data to export')
  }

  const cols: CsvColumn[] =
    columns && columns.length > 0
      ? columns
      : Object.keys(rows[0]).map((k) => ({ key: k }))

  const header = cols.map((c) => escapeField(c.label ?? c.key)).join(',')
  const body = rows
    .map((row) => cols.map((c) => escapeField(row[c.key])).join(','))
    .join('\r\n')

  return `${UTF8_BOM}${header}\r\n${body}`
}

/**
 * Trigger a browser download of rows as a CSV file.
 * Throws on empty rows (via rowsToCsv).
 */
export function exportCsv(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: CsvColumn[]
): void {
  const csv = rowsToCsv(rows, columns)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Format today as YYYYMMDD for default filenames. */
export function todayStamp(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}${m}${d}`
}

/** Build a default filename like `users-20260424.csv`. */
export function defaultCsvFilename(page: string, date: Date = new Date()): string {
  return `${page}-${todayStamp(date)}.csv`
}
