import { Megaphone } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'

import { Badge, Card, SkeletonCard } from '@/components/ui'
import type { Announcement } from '@/features/announcements'
import { cn } from '@/utils/cn'

interface AnnouncementsPreviewProps {
  announcements: Announcement[]
  loading: boolean
}

export function AnnouncementsPreview({ announcements, loading }: AnnouncementsPreviewProps) {
  const navigate = useNavigate()

  // Hide entirely when not loading and empty
  if (!loading && announcements.length === 0) return null

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-purple-500" />
          Pengumuman Terbaru
        </h2>
        <Link
          to="/announcements"
          className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Semua
        </Link>
      </div>
      {loading ? (
        <div className="space-y-3">
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              role="button"
              tabIndex={0}
              className={cn(
                'p-4 rounded-2xl border transition-colors cursor-pointer',
                ann.priority === 'high'
                  ? 'bg-red-50 border-red-100 hover:bg-red-100/60 dark:bg-red-950/30 dark:border-red-900/40 dark:hover:bg-red-900/40'
                  : 'border-slate-100 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800'
              )}
              onClick={() => navigate('/announcements')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate('/announcements')
                }
              }}
              aria-label={`Pengumuman: ${ann.title}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={ann.priority === 'high' ? 'danger' : 'info'} size="sm">
                  {ann.priority === 'high' ? 'PENTING' : 'INFO'}
                </Badge>
                <span
                  className={cn(
                    'text-xs font-medium',
                    ann.priority === 'high'
                      ? 'text-red-500 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  )}
                >
                  {new Date(ann.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              </div>
              <h3
                className={cn(
                  'font-bold mb-1',
                  ann.priority === 'high'
                    ? 'text-red-900 dark:text-red-300'
                    : 'text-slate-800 dark:text-slate-200'
                )}
              >
                {ann.title}
              </h3>
              <p
                className={cn(
                  'text-sm line-clamp-2',
                  ann.priority === 'high'
                    ? 'text-red-700/80 dark:text-red-400/80'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                {ann.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
