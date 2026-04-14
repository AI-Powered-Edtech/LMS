import { ChevronDown, ChevronRight, FileText, HelpCircle, Video } from 'lucide-react'
import { useState } from 'react'

import { cn } from '@/utils/cn'

import type { OutlineModule } from '../../types'

interface ModuleOutlineCardProps {
  module: OutlineModule
  index: number
  selected: boolean
  onToggle: () => void
}

function getLessonIcon(type: string) {
  switch (type) {
    case 'video':
      return <Video className="w-3.5 h-3.5 text-blue-500" />
    case 'quiz':
      return <HelpCircle className="w-3.5 h-3.5 text-rose-500" />
    default:
      return <FileText className="w-3.5 h-3.5 text-indigo-500" />
  }
}

export function ModuleOutlineCard({ module, index, selected, onToggle }: ModuleOutlineCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'rounded-xl border transition-all',
        selected
          ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-950/30'
          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500"
          aria-label={`Pilih modul ${module.title}`}
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          aria-label={expanded ? 'Tutup detail' : 'Lihat detail'}
        >
          {expanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Modul {index + 1}
          </span>
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
            {module.title}
          </h4>
        </div>
        <span className="text-[10px] font-medium text-slate-400">
          {module.lessons.length} materi
        </span>
      </div>

      {expanded && module.lessons.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-700 px-3 py-2 space-y-1">
          {module.lessons.map((lesson, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              {getLessonIcon(lesson.type)}
              <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 truncate">
                {lesson.title}
              </span>
              {lesson.duration_minutes && (
                <span className="text-[10px] text-slate-400">{lesson.duration_minutes} min</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
