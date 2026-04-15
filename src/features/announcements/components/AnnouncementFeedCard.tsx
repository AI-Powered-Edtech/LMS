import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Eye,
  MapPin,
  MessageSquare,
  Paperclip,
  Pin,
  User,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

import { CommentSection } from '@/components/Social/CommentSection'
import { OptimizedImage } from '@/components/ui'
import { cn } from '@/utils/cn'

interface Attachment {
  name: string
  type: 'pdf' | 'image' | 'doc'
  size: string
}

export interface AnnouncementCardData {
  id: string
  title: string
  content: string
  author: string
  date: string
  time?: string
  location?: string
  contactPerson?: string
  is_pinned: boolean
  priority: string
  target_audience?: string
  isRead: boolean
  allow_comments: boolean
  requires_rsvp: boolean
  rsvpStatus?: 'attending' | 'not_attending' | 'pending'
  attachments?: Attachment[]
  readCount?: { read: number; total: number }
}

interface AnnouncementFeedCardProps {
  announcement: AnnouncementCardData
  index: number
  role: string | null
  isCommentsExpanded: boolean
  onToggleComments: () => void
  onMarkAsRead: (id: string) => void
  onRSVP: (id: string, response: 'yes' | 'no' | 'maybe') => void
}

export function AnnouncementFeedCard({
  announcement,
  index,
  role,
  isCommentsExpanded,
  onToggleComments,
  onMarkAsRead,
  onRSVP,
}: AnnouncementFeedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={cn(
        'bg-white dark:bg-slate-800 rounded-3xl border transition-all duration-300 hover:shadow-md relative overflow-hidden group',
        !announcement.isRead
          ? 'border-blue-200 dark:border-blue-700 shadow-sm'
          : 'border-slate-200 dark:border-slate-700',
        announcement.is_pinned &&
          'border-amber-200 dark:border-amber-700 ring-1 ring-amber-100 dark:ring-amber-900/30'
      )}
    >
      {/* Unread Indicator */}
      {!announcement.isRead && <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />}

      <div className="p-6 sm:p-8">
        {/* Header: Badges & Pin */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex flex-wrap items-center gap-2">
            {announcement.is_pinned && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-bold rounded-full uppercase tracking-wider">
                <Pin className="w-3.5 h-3.5" /> Penting
              </span>
            )}
            {announcement.target_audience && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-full">
                <Users className="w-3.5 h-3.5" /> {announcement.target_audience.replace('_', ' ')}
              </span>
            )}
            {announcement.priority === 'high' && !announcement.is_pinned && (
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold rounded-full uppercase tracking-wider">
                Darurat
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4" />
              {announcement.date}
            </span>
          </div>
        </div>

        {/* Title & Content */}
        <h2
          className={cn(
            'text-2xl font-bold mb-4',
            !announcement.isRead
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-800 dark:text-slate-200'
          )}
        >
          {announcement.title}
        </h2>

        <div className="prose prose-slate dark:prose-invert max-w-none mb-6">
          <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300 leading-relaxed">
            {announcement.content}
          </p>
        </div>

        {/* Metadata Grid */}
        {(announcement.time || announcement.location || announcement.contactPerson) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl border border-slate-100 dark:border-slate-600">
            {announcement.time && (
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Waktu
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {announcement.time}
                  </p>
                </div>
              </div>
            )}
            {announcement.location && (
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Lokasi
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {announcement.location}
                  </p>
                </div>
              </div>
            )}
            {announcement.contactPerson && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <User className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Kontak Person
                  </p>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {announcement.contactPerson}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Attachments */}
        {announcement.attachments && announcement.attachments.length > 0 && (
          <div className="mb-6 space-y-2">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Lampiran:</p>
            <div className="flex flex-wrap gap-3">
              {announcement.attachments.map((file, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex items-center gap-3 p-3 pr-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-300 hover:shadow-sm transition-all group/file"
                >
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-600 group-hover/file:bg-blue-600 group-hover/file:text-white transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 group-hover/file:text-blue-600 transition-colors">
                      {file.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {file.size} &bull; {file.type.toUpperCase()}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* RSVP Section */}
        {announcement.requires_rsvp && role === 'student' && (
          <div className="mb-6 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-blue-900 dark:text-blue-300">
                Konfirmasi Kehadiran / Pemahaman
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                Mohon konfirmasi apakah Anda telah membaca dan memahami pengumuman ini.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {announcement.rsvpStatus === 'pending' ? (
                <button
                  onClick={() => onRSVP(announcement.id, 'yes')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
                >
                  Saya Mengerti
                </button>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-bold rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                  Telah Dikonfirmasi
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 border-t border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm">
              <OptimizedImage
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${announcement.author}`}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {announcement.author}
              </p>
              {role === 'teacher' && announcement.readCount && (
                <p className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-0.5">
                  <Eye className="w-3.5 h-3.5" /> Dibaca oleh {announcement.readCount.read}/
                  {announcement.readCount.total}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {announcement.allow_comments && (
              <button
                onClick={onToggleComments}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Diskusi
              </button>
            )}
            {!announcement.isRead && role === 'student' && !announcement.requires_rsvp && (
              <button
                onClick={() => onMarkAsRead(announcement.id)}
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-sm font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Tandai Dibaca
              </button>
            )}
          </div>
        </div>

        {/* Comments Section (Expandable) */}
        <AnimatePresence>
          {isCommentsExpanded && announcement.allow_comments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                <CommentSection entityId={announcement.id} entityType="announcement" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
