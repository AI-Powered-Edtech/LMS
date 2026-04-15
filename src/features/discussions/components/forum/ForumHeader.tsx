import { ForumBadge } from './ForumBadge'

interface ForumHeaderProps {
  knowledgePoints: number
}

export function ForumHeader({ knowledgePoints }: ForumHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
          Ruang Diskusi
          <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-sm rounded-full font-bold">
            Beta
          </span>
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">
          Tanya, jawab, dan belajar bersama komunitas. Dapatkan Knowledge Points (KP)!
        </p>
      </div>

      <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="text-center px-4 border-r border-slate-100 dark:border-slate-700">
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
            {knowledgePoints}
          </div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            KP Saya
          </div>
        </div>
        <div className="px-2">
          <ForumBadge text="Aktif" type="general" />
        </div>
      </div>
    </div>
  )
}
