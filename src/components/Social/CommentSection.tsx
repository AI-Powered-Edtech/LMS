import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Edit2, MessageSquare, MoreVertical, Pin, Send, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { memo, useCallback, useEffect, useState } from 'react'

import { OptimizedImage } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import { Discussion, discussionService } from '@/features/discussions/api/discussionService'
import { useToast } from '@/hooks/useToast'
import { cn } from '@/utils/cn'
import { logger } from '@/utils/logger'

// ⚡ Perf: CommentItem extracted to file-level and wrapped in React.memo.
// Previously defined INSIDE CommentSection's render body, which caused React
// to treat it as a brand-new component type on every parent render — unmounting
// and remounting all comment DOM (losing focus, scroll position, animations).
interface CommentItemProps {
  comment: Discussion
  isReply?: boolean
  userId?: string
  userRole?: string | null
  editingComment: string | null
  editContent: string
  openMenuId: string | null
  replyingTo: string | null
  newComment: string
  onSetEditingComment: (id: string | null) => void
  onSetEditContent: (content: string) => void
  onSetOpenMenuId: (id: string | null) => void
  onSetReplyingTo: (id: string | null) => void
  onSetNewComment: (content: string) => void
  onSubmit: (e?: React.FormEvent, parentId?: string | null) => void
  onDelete: (id: string) => void
  onTogglePin: (id: string, currentPin: boolean) => void
}

const CommentItem = memo(function CommentItem({
  comment,
  isReply = false,
  userId,
  userRole,
  editingComment,
  editContent,
  openMenuId,
  replyingTo,
  newComment,
  onSetEditingComment,
  onSetEditContent,
  onSetOpenMenuId,
  onSetReplyingTo,
  onSetNewComment,
  onSubmit,
  onDelete,
  onTogglePin,
}: CommentItemProps) {
  const isAuthor = comment.author_id === userId
  const isAdmin = userRole === 'admin' || userRole === 'teacher'
  const canManage = isAuthor || isAdmin

  return (
    <div className={cn('flex gap-3', isReply && 'ml-11 mt-4')}>
      <div className="w-8 h-8 bg-slate-200 rounded-full shrink-0 overflow-hidden">
        {comment.author?.avatar_url ? (
          <OptimizedImage
            src={comment.author.avatar_url}
            alt={`Foto profil ${comment.author?.full_name || 'pengguna'}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <OptimizedImage
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author?.full_name || comment.author_id}`}
            alt={`Foto profil ${comment.author?.full_name || 'pengguna'}`}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="flex-1">
        <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none border border-slate-100 group relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-slate-900">
              {comment.author?.full_name || 'User'}
            </span>
            <span className="text-xs text-slate-500">
              {formatDistanceToNow(new Date(comment.created_at), {
                addSuffix: true,
                locale: localeId,
              })}
            </span>
          </div>

          {editingComment === comment.id ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                onSubmit(undefined, comment.parent_id)
              }}
              className="mt-2"
            >
              <textarea
                autoFocus
                value={editContent}
                onChange={(e) => onSetEditContent(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={2}
              />
              <div className="flex justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => onSetEditingComment(null)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="text-xs px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Simpan
                </button>
              </div>
            </form>
          ) : (
            <p
              className={cn(
                'text-sm text-slate-700 whitespace-pre-wrap',
                comment.is_deleted && 'text-slate-400 italic'
              )}
            >
              {comment.content}
            </p>
          )}

          {/* Menu */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
            {isAdmin && !comment.is_deleted && (
              <button
                onClick={() => onTogglePin(comment.id, !!comment.is_pinned)}
                className="p-1 text-slate-400 hover:text-blue-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                title={comment.is_pinned ? 'Lepaskan sematan' : 'Sematkan'}
                aria-label={comment.is_pinned ? 'Lepaskan sematan' : 'Sematkan'}
              >
                <Pin
                  className={cn('w-4 h-4', comment.is_pinned && 'fill-blue-500 text-blue-500')}
                />
              </button>
            )}
            {!comment.is_deleted && canManage && (
              <div className="relative">
                <button
                  onClick={() => onSetOpenMenuId(openMenuId === comment.id ? null : comment.id)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                  aria-label="Opsi tambahan"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {openMenuId === comment.id && (
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-slate-100 py-1 z-10">
                    {isAuthor && (
                      <button
                        onClick={() => {
                          onSetEditingComment(comment.id)
                          onSetEditContent(comment.content)
                          onSetOpenMenuId(null)
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex flex-center gap-2"
                      >
                        <Edit2 className="w-3.5 h-3.5" /> Ubah
                      </button>
                    )}
                    <button
                      onClick={() => onDelete(comment.id)}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!comment.is_deleted && !isReply && (
          <div className="flex items-center gap-4 mt-1 ml-2">
            <button
              onClick={() => onSetReplyingTo(replyingTo === comment.id ? null : comment.id)}
              className="text-xs text-slate-500 font-medium hover:text-blue-600 transition-colors"
            >
              Balas
            </button>
          </div>
        )}

        {/* Reply Input */}
        <AnimatePresence>
          {replyingTo === comment.id && !isReply && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden"
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  onSubmit(undefined, comment.id)
                }}
                className="flex gap-3"
              >
                <input
                  type="text"
                  autoFocus
                  value={newComment}
                  onChange={(e) => onSetNewComment(e.target.value)}
                  placeholder="Tulis balasan..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  aria-label="Kirim balasan"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nested Replies */}
        {comment.replies &&
          comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              isReply
              userId={userId}
              userRole={userRole}
              editingComment={editingComment}
              editContent={editContent}
              openMenuId={openMenuId}
              replyingTo={replyingTo}
              newComment={newComment}
              onSetEditingComment={onSetEditingComment}
              onSetEditContent={onSetEditContent}
              onSetOpenMenuId={onSetOpenMenuId}
              onSetReplyingTo={onSetReplyingTo}
              onSetNewComment={onSetNewComment}
              onSubmit={onSubmit}
              onDelete={onDelete}
              onTogglePin={onTogglePin}
            />
          ))}
      </div>
    </div>
  )
})

interface CommentSectionProps {
  entityId: string
  entityType: 'announcement' | 'course' | 'lesson'
  className?: string
}

export function CommentSection({ entityId, entityType, className }: CommentSectionProps) {
  const { user, tenantId, role } = useAuth()
  const addToast = useToast((s) => s.addToast)

  const [comments, setComments] = useState<Discussion[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const loadComments = useCallback(async () => {
    try {
      await discussionService.fetchDiscussions({
        tenantId: tenantId!,
        [`${entityType}Id`]: entityId,
        parentId: null, // Fetch top-level comments first
      })

      // Note: For a fully threaded view, we might want to fetch all and format into a tree,
      // or fetch replies on demand. For simplicity, we fetch all for this entity if parentId isn't specified,
      // but let's fetch all and tree-ify them in memory for now.
      const allComments = await discussionService.fetchDiscussions({
        tenantId: tenantId!,
        [`${entityType}Id`]: entityId,
      })

      // Build Tree
      const commentMap = new Map<string, Discussion>()
      const roots: Discussion[] = []

      allComments.forEach((c) => {
        c.replies = []
        commentMap.set(c.id, c)
      })

      allComments.forEach((c) => {
        if (c.parent_id) {
          const parent = commentMap.get(c.parent_id)
          if (parent) {
            parent.replies?.push(c)
          }
        } else {
          roots.push(c)
        }
      })

      setComments(roots)
    } catch (error) {
      if (import.meta.env.DEV) logger.error('Error loading comments:', error)
      addToast({ type: 'error', message: 'Gagal memuat komentar' })
    } finally {
      setLoading(false)
    }
  }, [entityId, entityType, addToast, tenantId])

  useEffect(() => {
    void loadComments()
  }, [entityId, entityType, loadComments])

  const handleSubmit = async (e?: React.FormEvent, parentId: string | null = null) => {
    if (e) e.preventDefault()

    const content = parentId ? (editingComment ? editContent : newComment) : newComment
    if (!content.trim() || !user || !tenantId) return

    try {
      await discussionService.saveDiscussion({
        id: editingComment || undefined,
        tenant_id: tenantId,
        author_id: user.id,
        [`${entityType}_id`]: entityId,
        content: content.trim(),
        parent_id: parentId,
      })

      setNewComment('')
      setReplyingTo(null)
      setEditingComment(null)
      setEditContent('')
      // subscription will trigger reload
    } catch {
      addToast({ type: 'error', message: 'Gagal mengirim komentar' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus komentar ini?')) return
    try {
      await discussionService.deleteDiscussion(id, tenantId!)
      setOpenMenuId(null)
    } catch {
      addToast({ type: 'error', message: 'Gagal menghapus komentar' })
    }
  }

  const handleTogglePin = useCallback(
    async (id: string, currentPin: boolean) => {
      try {
        await discussionService.togglePin(id, !currentPin, tenantId!)
      } catch {
        addToast({ type: 'error', message: 'Gagal mengubah status sematan komentar' })
      }
    },
    [addToast, tenantId]
  )

  if (loading) {
    return <div className="py-8 text-center text-slate-500 text-sm">Memuat diskusi...</div>
  }

  return (
    <div className={cn('space-y-6', className)}>
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-slate-800 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-500" /> Diskusi & Komentar
        </h4>
        <span className="text-sm font-medium text-slate-500">{comments.length} Komentar</span>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            userId={user?.id}
            userRole={role}
            editingComment={editingComment}
            editContent={editContent}
            openMenuId={openMenuId}
            replyingTo={replyingTo}
            newComment={newComment}
            onSetEditingComment={setEditingComment}
            onSetEditContent={setEditContent}
            onSetOpenMenuId={setOpenMenuId}
            onSetReplyingTo={setReplyingTo}
            onSetNewComment={setNewComment}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            onTogglePin={handleTogglePin}
          />
        ))}
        {comments.length === 0 && (
          <p className="text-center text-sm text-slate-500 py-4">
            Belum ada komentar. Jadilah yang pertama!
          </p>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSubmit()
        }}
        className="mt-6 flex gap-3 pt-4 border-t border-slate-100"
      >
        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full shrink-0 flex items-center justify-center font-bold text-sm">
          {user?.email?.charAt(0).toUpperCase() || 'U'}
        </div>
        <div className="flex-1 relative">
          <input
            type="text"
            value={replyingTo ? '' : newComment}
            onChange={(e) => !replyingTo && setNewComment(e.target.value)}
            placeholder="Tulis komentar atau pertanyaan..."
            className="w-full pl-4 pr-12 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
            disabled={!!replyingTo}
          />
          <button
            type="submit"
            disabled={!!replyingTo || !newComment.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-blue-600"
            aria-label="Kirim komentar"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  )
}
