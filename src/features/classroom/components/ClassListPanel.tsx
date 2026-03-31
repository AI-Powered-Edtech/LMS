import { BookOpen, Hash, Loader2, Search, Users } from 'lucide-react'

import { cn } from '@/utils/cn'

interface Classroom {
  id: string
  name: string
  join_code: string
}

interface ClassListPanelProps {
  filteredClassrooms: Classroom[]
  selectedClassId: string | null
  studentCounts: Record<string, number>
  classLoading: boolean
  searchQuery: string
  onSearchChange: (query: string) => void
  onSelectClass: (id: string) => void
}

export function ClassListPanel({
  filteredClassrooms,
  selectedClassId,
  studentCounts,
  classLoading,
  searchQuery,
  onSearchChange,
  onSelectClass,
}: ClassListPanelProps) {
  return (
    <div className="w-full lg:w-80 shrink-0 space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder="Cari kelas..."
          className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />
      </div>

      {classLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Memuat kelas...</span>
        </div>
      ) : filteredClassrooms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mb-2 opacity-30" />
          <p className="text-sm font-medium text-slate-500">Belum ada kelas</p>
          <p className="text-xs mt-1">Klik "Buat Kelas Baru" untuk memulai</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredClassrooms.map((cls) => (
            <button
              key={cls.id}
              onClick={() => onSelectClass(cls.id)}
              className={cn(
                'w-full text-left p-4 rounded-2xl border transition-all',
                selectedClassId === cls.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-300 dark:border-indigo-700 shadow-sm'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <h3
                  className={cn(
                    'font-bold text-sm truncate',
                    selectedClassId === cls.id
                      ? 'text-indigo-700 dark:text-indigo-300'
                      : 'text-slate-800 dark:text-slate-200'
                  )}
                >
                  {cls.name}
                </h3>
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0',
                    selectedClassId === cls.id
                      ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                  )}
                >
                  {cls.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {studentCounts[cls.id] ?? '...'} siswa
                </span>
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {cls.join_code}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
