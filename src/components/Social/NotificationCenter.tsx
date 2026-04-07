import { formatDistanceToNow } from 'date-fns'
import { id } from 'date-fns/locale'
import { Bell, Check, ExternalLink, Inbox } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { EmptyState } from '@/components/ui'
import type { Notification } from '@/features/notifications'
import { useMarkAllAsRead, useMarkAsRead, useNotifications } from '@/features/notifications'

import { cn } from '../../utils/cn'

export const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, isLoading: loading } = useNotifications()
  const markAsReadMutation = useMarkAsRead()
  const markAllAsReadMutation = useMarkAllAsRead()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close on click outside and Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [])

  const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    markAsReadMutation.mutate(id)
  }

  const handleMarkAllAsRead = async () => {
    markAllAsReadMutation.mutate()
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifikasi"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-slate-900">Notifikasi</h3>
                <p className="text-[10px] text-slate-500">
                  Anda memiliki {unreadCount} pesan belum dibaca
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  Tandai semua dibaca
                </button>
              )}
            </div>

            {/* Content */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading && notifications.length === 0 ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : notifications.length === 0 ? (
                <EmptyState
                  icon={<Inbox className="w-8 h-8" />}
                  title="Kotak masuk kosong"
                  description="Semua notifikasi baru akan muncul di sini"
                />
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications.map((notif) => (
                    <NotificationItem
                      key={notif.id}
                      notification={notif}
                      onRead={(e) => handleMarkAsRead(notif.id, e)}
                      onClose={() => setIsOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 text-center">
              <button className="text-xs text-slate-500 font-medium hover:text-slate-700">
                Lihat Semua Aktivitas
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onRead: (e: React.MouseEvent) => void
  onClose: () => void
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onClose }) => {
  const iconMap: Partial<Record<Notification['type'], string>> = {
    grade: '📜',
    grade_posted: '📜',
    discussion_reply: '💬',
    announcement: '📢',
    system: '⚡',
    badge_earned: '🏆',
    assignment_due: '📚',
    quiz_available: '📝',
    course_enrolled: '🎓',
  }

  return (
    <div
      className={cn(
        'p-4 transition-colors relative group hover:bg-slate-50',
        !notification.is_read && 'bg-blue-50/40'
      )}
    >
      <div className="flex gap-4">
        <div className="text-2xl mt-1 select-none">{iconMap[notification.type] ?? '🔔'}</div>
        <div className="flex-1 space-y-1">
          <div className="flex justify-between items-start gap-2">
            <h4
              className={cn(
                'text-sm transition-colors',
                notification.is_read
                  ? 'text-slate-600'
                  : 'font-bold text-slate-900 group-hover:text-blue-600'
              )}
            >
              {notification.title}
            </h4>
            {!notification.is_read && (
              <div className="w-2 h-2 bg-blue-600 rounded-full mt-1.5 flex-shrink-0 ring-4 ring-blue-50" />
            )}
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">{notification.message}</p>
          <div className="flex justify-between items-center pt-1">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {formatDistanceToNow(new Date(notification.created_at), {
                addSuffix: true,
                locale: id,
              })}
            </span>

            {notification.link && (
              <Link
                to={notification.link}
                onClick={onClose}
                className="text-[10px] text-blue-600 font-bold flex items-center gap-1 hover:underline"
              >
                TINJAU <ExternalLink className="w-2 h-2" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {!notification.is_read && (
        <button
          onClick={onRead}
          className="absolute right-4 top-10 opacity-0 group-hover:opacity-100 p-1 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-blue-50 hover:text-blue-600 text-slate-400 transition-all"
          title="Tandai sudah dibaca"
          aria-label="Tandai sudah dibaca"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
