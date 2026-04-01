import { MessageSquare, Send } from 'lucide-react'

import { EmptyState } from '@/components/ui'
import { cn } from '@/utils/cn'

interface Comment {
  id: string
  text: string
  author: string
  time: string
}

interface PrivateCommentsPanelProps {
  comments: Comment[]
  newComment: string
  role: string
  assignmentId: string
  onCommentChange: (text: string) => void
  onAddComment: (assignmentId: string) => void
}

export function PrivateCommentsPanel({
  comments,
  newComment,
  role,
  assignmentId,
  onCommentChange,
  onAddComment,
}: PrivateCommentsPanelProps) {
  const currentAuthor = role === 'teacher' ? 'Guru' : 'Anda'

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-slate-400 dark:text-slate-500" />
          <h3 className="font-bold text-slate-800 dark:text-white">Komentar Pribadi</h3>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[200px]">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={cn(
                'flex flex-col max-w-[85%]',
                comment.author === currentAuthor ? 'ml-auto items-end' : 'items-start'
              )}
            >
              <div
                className={cn(
                  'p-3 rounded-2xl text-sm',
                  comment.author === currentAuthor
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                )}
              >
                {comment.text}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">
                {comment.author} • {comment.time}
              </span>
            </div>
          ))}
          {comments.length === 0 && (
            <EmptyState
              icon={<MessageSquare className="w-8 h-8" />}
              title="Belum ada komentar pribadi"
            />
          )}
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex gap-2 relative">
            <input
              type="text"
              value={newComment}
              onChange={(e) => onCommentChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onAddComment(assignmentId)}
              placeholder="Tambahkan komentar..."
              className="w-full pl-4 pr-10 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm dark:text-white"
            />
            <button
              onClick={() => onAddComment(assignmentId)}
              disabled={!newComment.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg disabled:opacity-50 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
