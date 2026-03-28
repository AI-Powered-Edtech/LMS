import { Archive, Download, ExternalLink, File, FileText, Presentation, Sheet } from 'lucide-react'

interface FileBlockViewerProps {
  url: string
  title?: string | null
}

function getFileIcon(url: string) {
  const extension = url.split('.').pop()?.toLowerCase() || ''

  switch (extension) {
    case 'pdf':
      return <FileText className="w-10 h-10 text-red-500" />
    case 'doc':
    case 'docx':
      return <FileText className="w-10 h-10 text-blue-500" />
    case 'ppt':
    case 'pptx':
      return <Presentation className="w-10 h-10 text-orange-500" />
    case 'xls':
    case 'xlsx':
      return <Sheet className="w-10 h-10 text-green-500" />
    case 'zip':
    case 'rar':
      return <Archive className="w-10 h-10 text-purple-500" />
    default:
      return <File className="w-10 h-10 text-slate-400" />
  }
}

function getFileTypeLabel(url: string): string {
  const extension = url.split('.').pop()?.toLowerCase() || ''

  switch (extension) {
    case 'pdf':
      return 'PDF Document'
    case 'doc':
    case 'docx':
      return 'Word Document'
    case 'ppt':
    case 'pptx':
      return 'PowerPoint Presentation'
    case 'xls':
    case 'xlsx':
      return 'Excel Spreadsheet'
    case 'zip':
    case 'rar':
      return 'ZIP Archive'
    default:
      return 'File'
  }
}

function isPdf(url: string): boolean {
  return url.toLowerCase().endsWith('.pdf')
}

export function FileBlockViewer({ url, title }: FileBlockViewerProps) {
  const fileName = title || url.split('/').pop() || 'Download File'
  const fileTypeLabel = getFileTypeLabel(url)
  const isPdfFile = isPdf(url)

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
      {/* File Icon */}
      <div className="p-3 bg-white rounded-xl shadow-sm">{getFileIcon(url)}</div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-800 truncate">{fileName}</p>
        <p className="text-sm text-slate-500">{fileTypeLabel}</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 w-full sm:w-auto">
        {isPdfFile && (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Buka
          </a>
        )}
        <a
          href={url}
          download={fileName}
          target="_blank"
          rel="noreferrer"
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Unduh
        </a>
      </div>
    </div>
  )
}
