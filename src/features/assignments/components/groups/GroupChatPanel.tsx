import { MessageCircle, MessageSquare, Send } from 'lucide-react'

import { EmptyState } from '@/components/ui'
import { cn } from '@/utils/cn'

import { GroupMessage } from '../../api/groupAssignmentService'

interface Props {
  chat: GroupMessage[]
  myUserId: string
  newMessage: string
  onMessageChange: (msg: string) => void
  onSend: () => void
}

export function GroupChatPanel({ chat, myUserId, newMessage, onMessageChange, onSend }: Props) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[500px]">
      <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-3xl flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-slate-800 dark:text-slate-200">Diskusi Kelompok</h3>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-900/30 custom-scrollbar">
        {chat.length === 0 ? (
          <EmptyState
            icon={<MessageCircle className="w-8 h-8" />}
            title="Belum ada pesan"
            description="Mulai diskusi dengan anggota grup"
          />
        ) : (
          chat.map((msg) => {
            const isMe = msg.user_id === myUserId
            const senderName = isMe
              ? 'Anda'
              : msg.profiles
                ? `${msg.profiles.first_name} ${msg.profiles.last_name}`
                : 'Unknown'
            const time = new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex flex-col max-w-[85%]',
                  isMe ? 'ml-auto items-end' : 'items-start'
                )}
              >
                <span className="text-[10px] text-slate-500 mb-1 font-medium ml-1">
                  {senderName}
                </span>
                <div
                  className={cn(
                    'p-3 rounded-2xl text-sm shadow-sm',
                    isMe
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                  )}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">{time}</span>
              </div>
            )
          })
        )}
      </div>

      <div className="p-3 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-b-3xl">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSend()}
            placeholder="Ketik pesan..."
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-900 dark:text-slate-100"
          />
          <button
            onClick={onSend}
            disabled={!newMessage.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg disabled:opacity-50 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
