import { MessageCircle, Send, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { aiProvider } from '@/services/ai/aiProvider'

interface LessonAiTutorProps {
  /** Lesson context the tutor should anchor on (title + body excerpt). */
  lessonContext: string
  /** Optional: subject name for system-prompt grounding. */
  subjectName?: string
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Streaming Q&A tutor panel (Fase 6 Unit 43). Embed inside LessonViewer.
 *
 * Uses Groq for low-latency streaming. Maintains short rolling context (last
 * 6 turns) to keep token cost bounded. The tutor is grounded in the current
 * lesson — explicit instruction to refuse off-topic queries.
 */
export function LessonAiTutor({ lessonContext, subjectName }: LessonAiTutorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const systemPrompt = `Anda tutor AI yang membantu siswa SMA memahami pelajaran ${subjectName ?? ''}.
Anda HANYA menjawab pertanyaan terkait materi berikut. Untuk pertanyaan di luar materi, ajak siswa fokus kembali ke pelajaran.
Jawab dalam Bahasa Indonesia, singkat (max 4 kalimat), jelas, gunakan analogi konkret jika perlu.

KONTEKS MATERI:
${lessonContext.slice(0, 2000)}`

  async function handleSend() {
    const text = input.trim()
    if (!text || streaming) return
    setInput('')
    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setStreaming(true)

    const window = newMessages.slice(-6)
    const promptMessages: ChatMessage[] = [{ role: 'system', content: systemPrompt }, ...window]

    let assistantBuf = ''
    setMessages([...newMessages, { role: 'assistant', content: '' }])

    try {
      for await (const chunk of aiProvider.streamCompletion({
        provider: 'groq',
        messages: promptMessages,
        maxTokens: 400,
        temperature: 0.5,
        stream: true,
      })) {
        assistantBuf += chunk
        setMessages([...newMessages, { role: 'assistant', content: assistantBuf }])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan'
      setMessages([...newMessages, { role: 'assistant', content: `(error: ${msg})` }])
    } finally {
      setStreaming(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Buka tutor AI"
        className="fixed bottom-6 right-6 inline-flex items-center gap-2 px-4 py-3 rounded-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-medium">Tutor AI</span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 h-[28rem] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-50">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-violet-500" />
          <span className="font-semibold text-sm text-slate-900 dark:text-white">Tutor AI</span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Tutup tutor"
          className="text-slate-400 hover:text-slate-700 text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-center mt-12 px-4">
            Tanya apa pun terkait materi ini. Saya akan bantu jelaskan.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                m.role === 'user'
                  ? 'ml-auto bg-violet-600 text-white'
                  : 'mr-auto bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          ))
        )}
        {streaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="mr-auto bg-slate-100 dark:bg-slate-800 rounded-lg px-3 py-2">...</div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void handleSend()
        }}
        className="border-t border-slate-200 dark:border-slate-700 p-2 flex items-center gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Tanya tentang materi ini..."
          aria-label="Tanya tutor AI"
          disabled={streaming}
          className="flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={streaming || !input.trim()}
          icon={<Send className="w-4 h-4" />}
        >
          Kirim
        </Button>
      </form>
    </div>
  )
}
