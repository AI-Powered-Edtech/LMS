// ==========================================================================
// MessageThread — Tampilan Chat dalam Satu Thread
// Wave 4 — Task 29.5 (Mobile-first)
//
// Fitur:
// - Real-time via Supabase Realtime subscription
// - Scroll to bottom saat ada pesan baru
// - Timestamp per pesan
// - Quick reply templates
// - Input pesan dengan kirim button
// ==========================================================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/services/supabase/client'
import { cn } from '@/utils/cn'

import type { MessageThread as MessageThreadType, ThreadMessage } from '../api/messageApi'
import { getMessages, getThreads, markThreadRead, sendMessage } from '../api/messageApi'

// ── Constants ─────────────────────────────────────────────────────────────

const QUICK_REPLIES = [
  'Terima kasih',
  'Anak saya sakit hari ini',
  'Bisakah kita meeting?',
  'Mohon informasinya',
  'Baik, saya mengerti',
]

// ── Helpers ───────────────────────────────────────────────────────────────

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  })
}

function formatDateGroup(dateStr: string): string {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()

  if (isSameDay(date, today)) return 'Hari ini'
  if (isSameDay(date, yesterday)) return 'Kemarin'
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Message Bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message, isMine }: { message: ThreadMessage; isMine: boolean }) {
  return (
    <div className={cn('flex items-end gap-2', isMine ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar (hanya untuk pesan lawan) */}
      {!isMine && (
        <div
          className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center
                     text-xs font-bold overflow-hidden mb-0.5
                     bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
        >
          {message.sender_avatar ? (
            <img
              src={message.sender_avatar}
              alt={message.sender_name}
              className="w-full h-full object-cover"
            />
          ) : (
            getInitials(message.sender_name ?? 'G')
          )}
        </div>
      )}

      <div className={cn('max-w-[75%] flex flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
        {/* Bubble */}
        <div
          className={cn(
            'px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
            isMine
              ? 'bg-blue-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-600'
          )}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <p className="text-[10px] text-slate-400 dark:text-slate-500 px-1">
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  )
}

// ── Date Separator ─────────────────────────────────────────────────────────

function DateSeparator({ date }: { date: string }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
      <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">
        {formatDateGroup(date)}
      </p>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
    </div>
  )
}

// ── Loading Skeleton ───────────────────────────────────────────────────────

function MessagesSkeleton() {
  return (
    <div className="flex-1 p-4 space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'flex items-end gap-2 animate-pulse',
            i % 2 === 0 ? 'flex-row-reverse' : 'flex-row'
          )}
        >
          <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
          <div
            className={cn(
              'h-10 rounded-2xl bg-slate-200 dark:bg-slate-700',
              i % 2 === 0 ? 'w-32' : 'w-48'
            )}
          />
        </div>
      ))}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────

export function MessageThread() {
  const { threadId } = useParams<{ threadId: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [inputText, setInputText] = useState('')
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // ── Queries ────────────────────────────────────────────────
  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['parent', 'messages', threadId ?? ''],
    queryFn: () => getMessages(threadId!),
    enabled: !!threadId,
    refetchInterval: false,
  })

  // Fetch thread info (untuk header)
  const { data: threads } = useQuery({
    queryKey: ['parent', 'threads', user?.id ?? ''],
    queryFn: () => getThreads(user!.id),
    enabled: !!user?.id,
  })

  const currentThread: MessageThreadType | undefined = threads?.find((t) => t.id === threadId)

  // ── Mark read saat buka thread ─────────────────────────────
  useEffect(() => {
    if (threadId && currentThread?.parent_unread_count) {
      markThreadRead(threadId, 'parent').then(() => {
        queryClient.invalidateQueries({ queryKey: ['parent', 'threads', user?.id ?? ''] })
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId])

  // ── Supabase Realtime subscription ────────────────────────
  useEffect(() => {
    if (!threadId) return

    const channel = supabase
      .channel(`messages:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'parent_teacher_messages',
          filter: `thread_id=eq.${threadId}`,
        },
        (_payload) => {
          // Refetch messages saat ada pesan baru
          queryClient.invalidateQueries({ queryKey: ['parent', 'messages', threadId] })
          queryClient.invalidateQueries({ queryKey: ['parent', 'threads', user?.id ?? ''] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [threadId, queryClient, user?.id])

  // ── Scroll to bottom ────────────────────────────────────────
  const scrollToBottom = useCallback((smooth = false) => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'instant',
      })
    }
  }, [])

  useEffect(() => {
    if (!messagesLoading && messages) {
      scrollToBottom()
    }
  }, [messages, messagesLoading, scrollToBottom])

  // ── Send message mutation ───────────────────────────────────
  const { mutate: doSend, isPending: isSending } = useMutation({
    mutationFn: (content: string) => sendMessage(threadId!, content),
    onSuccess: (newMessage) => {
      // Optimistic: tambahkan ke cache sebelum refetch
      queryClient.setQueryData(
        ['parent', 'messages', threadId ?? ''],
        (old: ThreadMessage[] | undefined) => [...(old ?? []), newMessage]
      )
      setInputText('')
      setShowQuickReplies(false)
      setTimeout(() => scrollToBottom(true), 50)
    },
  })

  function handleSend() {
    const trimmed = inputText.trim()
    if (!trimmed || isSending) return
    doSend(trimmed)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleQuickReply(text: string) {
    setInputText(text)
    setShowQuickReplies(false)
    inputRef.current?.focus()
  }

  // ── Group messages by date ──────────────────────────────────
  const groupedMessages = (messages ?? []).reduce<
    Array<{ date: string; messages: ThreadMessage[] }>
  >((groups, msg) => {
    const msgDate = msg.created_at.split('T')[0]
    const last = groups[groups.length - 1]
    if (last && last.date === msgDate) {
      last.messages.push(msg)
    } else {
      groups.push({ date: msgDate, messages: [msg] })
    }
    return groups
  }, [])

  const teacherName = currentThread?.teacher_name ?? 'Guru'
  const studentName = currentThread?.student_name

  return (
    <div className="-mx-4 -mt-4 flex flex-col" style={{ height: 'calc(100dvh - 120px)' }}>
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4 py-3 flex-shrink-0
                   bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm
                   border-b border-slate-200 dark:border-slate-700"
      >
        <button
          onClick={() => navigate('/app/parent/pesan')}
          className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center
                     rounded-xl text-slate-500 dark:text-slate-400
                     active:bg-slate-100 dark:active:bg-slate-800
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Kembali"
        >
          <span className="text-lg" aria-hidden="true">
            ←
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
            {teacherName}
          </p>
          {studentName && (
            <p className="text-xs text-slate-400 dark:text-slate-500">Re: {studentName}</p>
          )}
        </div>
      </div>

      {/* ── Messages Area ───────────────────────────────────── */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-1
                   bg-gray-50 dark:bg-gray-900/50"
      >
        {messagesLoading ? (
          <MessagesSkeleton />
        ) : !messages || messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <span className="text-4xl" aria-hidden="true">
              💬
            </span>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Belum ada pesan. Mulailah percakapan!
            </p>
          </div>
        ) : (
          groupedMessages.map(({ date, messages: dayMessages }) => (
            <div key={date}>
              <DateSeparator date={dayMessages[0].created_at} />
              <div className="space-y-2">
                {dayMessages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} isMine={msg.sender_id === user?.id} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Quick Replies ─────────────────────────────────────── */}
      {showQuickReplies && (
        <div
          className="flex-shrink-0 px-3 py-2 flex gap-2 overflow-x-auto
                     bg-white dark:bg-slate-800
                     border-t border-slate-200 dark:border-slate-700
                     scrollbar-none"
        >
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => handleQuickReply(reply)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                         bg-slate-100 dark:bg-slate-700
                         text-slate-700 dark:text-slate-300
                         active:bg-blue-100 dark:active:bg-blue-900/30
                         active:text-blue-700 dark:active:text-blue-300
                         border border-slate-200 dark:border-slate-600
                         transition-colors focus:outline-none"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* ── Input Area ────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-end gap-2 px-3 py-3
                   bg-white dark:bg-slate-800
                   border-t border-slate-200 dark:border-slate-700"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
      >
        {/* Quick replies toggle */}
        <button
          onClick={() => setShowQuickReplies((v) => !v)}
          className={cn(
            'flex-shrink-0 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center',
            'text-slate-400 dark:text-slate-500',
            'active:bg-slate-100 dark:active:bg-slate-700',
            'transition-colors focus:outline-none',
            showQuickReplies && 'text-blue-500 dark:text-blue-400'
          )}
          aria-label="Pesan cepat"
        >
          <span className="text-lg" aria-hidden="true">
            ⚡
          </span>
        </button>

        {/* Text input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan..."
            rows={1}
            className={cn(
              'w-full resize-none rounded-2xl px-4 py-2.5',
              'text-sm text-slate-900 dark:text-slate-100',
              'bg-slate-100 dark:bg-slate-700/50',
              'border border-slate-200 dark:border-slate-600',
              'placeholder-slate-400 dark:placeholder-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'max-h-[120px] overflow-y-auto leading-relaxed',
              'transition-all'
            )}
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={!inputText.trim() || isSending}
          className={cn(
            'flex-shrink-0 min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center',
            'transition-all focus:outline-none',
            inputText.trim() && !isSending
              ? 'bg-blue-600 text-white active:bg-blue-700'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500',
            'focus-visible:ring-2 focus-visible:ring-blue-500'
          )}
          aria-label="Kirim pesan"
        >
          {isSending ? (
            <span className="text-sm" aria-hidden="true">
              ⏳
            </span>
          ) : (
            <span className="text-base" aria-hidden="true">
              📤
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
