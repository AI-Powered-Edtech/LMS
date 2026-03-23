import { Award, ShieldCheck } from 'lucide-react'

import { cn } from '@/src/utils/cn'

interface ForumBadgeProps {
  text: string
  type: 'teacher' | 'subject' | 'general'
}

export function ForumBadge({ text, type }: ForumBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
        type === 'teacher'
          ? 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700'
          : type === 'subject'
            ? 'bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700'
            : 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
      )}
    >
      {type === 'teacher' && <ShieldCheck className="w-3 h-3" />}
      {type === 'subject' && <Award className="w-3 h-3" />}
      {text}
    </span>
  )
}

/** Resolve badge type from its label */
export function resolveBadgeType(badge: string): 'teacher' | 'subject' | 'general' {
  if (badge.includes('Teacher')) return 'teacher'
  if (badge.includes('Master')) return 'subject'
  return 'general'
}
