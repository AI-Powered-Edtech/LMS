/**
 * AI Tutor Panel Component
 *
 * Main chat interface for AI Tutor within the Smart Player.
 * Provides contextual help based on the current lesson.
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Bot, User, Lightbulb } from 'lucide-react'
import { cn } from '@/src/utils/cn'
import { useAuth } from '@/src/contexts/AuthContext'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  askTutor,
  type AITutorMessage,
  type DifficultyLevel,
  type AITutorError,
  formatDifficulty,
  getDifficultyColor,
  generateMessageId,
} from '@/src/features/ai-tutor'
import { aiTutorRateLimiter } from '@/src/utils/rateLimiter'
import { AITutorInput } from './AITutorInput'
import { AITutorTyping } from './AITutorTyping'

interface AITutorPanelProps {
  lessonId: string
  lessonTitle: string
  courseId: string
  initialDifficulty?: DifficultyLevel
  onClose?: () => void
}

const SUGGESTED_QUESTIONS = [
  'Apa inti pembelajaran dari materi ini?',
  'Bisakah jelaskan konsep yang sulit?',
  'Apa hubungannya dengan materi sebelumnya?',
]

export function AITutorPanel({
  lessonId,
  lessonTitle,
  initialDifficulty = 'not_started',
  onClose: _onClose,
}: AITutorPanelProps) {
  const { tenantId } = useAuth()
  // State
  const [messages, setMessages] = useState<AITutorMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<AITutorError | null>(null)
  const [difficulty, _setDifficulty] = useState<DifficultyLevel>(initialDifficulty)
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>(SUGGESTED_QUESTIONS)
  const [sessionId, setSessionId] = useState<string | undefined>(() => {
    return localStorage.getItem(`ai_tutor_session_${lessonId}`) || undefined
  })

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0 && !isLoading) {
      const welcomeMessage: AITutorMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Halo! Saya Tutor AI Anda untuk pelajaran "${lessonTitle}".\n\nSaya bisa membantu menjelaskan materi, menjawab pertanyaan, atau memberikan contoh tambahan. Silakan tulis pertanyaan Anda!`,
        timestamp: new Date(),
      }
      setMessages([welcomeMessage])
    }
  }, [lessonTitle, messages.length, isLoading])

  const handleSendQuestion = async (question: string) => {
    // Client-side rate limiting
    const { allowed, retryAfterMs } = aiTutorRateLimiter.check(lessonId)
    if (!allowed) {
      const seconds = Math.ceil(retryAfterMs / 1000)
      setError({
        message: `Terlalu banyak percobaan. Silakan coba lagi dalam ${seconds} detik.`,
        code: 'RATE_LIMIT_MINUTE',
        retryAfter: seconds,
      })
      return
    }

    // Add user message
    const userMessage: AITutorMessage = {
      id: generateMessageId(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setError(null)
    setIsLoading(true)

    try {
      const result = await askTutor(lessonId, question, tenantId!, sessionId)

      if (result.error) {
        setError(result.error)

        // Add error message from AI
        const errorMessage: AITutorMessage = {
          id: generateMessageId(),
          role: 'assistant',
          content: result.error.message,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, errorMessage])
        return
      }

      // Update session ID if it's new
      const responseData = result.data!
      if (responseData.session_id && responseData.session_id !== sessionId) {
        setSessionId(responseData.session_id)
        localStorage.setItem(`ai_tutor_session_${lessonId}`, responseData.session_id)
      }

      // Add AI response
      const aiMessage: AITutorMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: responseData.response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])

      // Remove used suggested question if matches
      setSuggestedQuestions((prev) => prev.filter((q) => q !== question))
    } catch (err) {
      console.error('[AI Tutor] Unexpected error:', err)
      const errorMessage: AITutorMessage = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestedClick = (question: string) => {
    if (!isLoading) {
      handleSendQuestion(question)
    }
  }

  const handleClearChat = () => {
    localStorage.removeItem(`ai_tutor_session_${lessonId}`)
    setSessionId(undefined)
    setMessages([])
    setError(null)
    setSuggestedQuestions(SUGGESTED_QUESTIONS)
    // Add welcome message again
    const welcomeMessage: AITutorMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: `Halo! Saya Tutor AI Anda untuk pelajaran "${lessonTitle}".\n\nSaya bisa membantu menjelaskan materi, menjawab pertanyaan, atau memberikan contoh tambahan. Silakan tulis pertanyaan Anda!`,
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-gradient-to-r from-white to-violet-50/30 border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-slate-800">Tutor AI</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Level:</span>
              <span
                className={cn(
                  'text-xs font-bold px-2 py-0.5 rounded-md',
                  getDifficultyColor(difficulty)
                )}
              >
                {formatDifficulty(difficulty)}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          Hapus Chat
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {/* Suggested Questions (when no messages besides welcome) */}
        {messages.length <= 1 && !isLoading && (
          <div className="mb-4">
            <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" />
              Suggestions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestedClick(q)}
                  disabled={isLoading}
                  className="text-xs px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-all disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={cn(
                'flex items-start gap-3',
                message.role === 'user' && 'flex-row-reverse'
              )}
            >
              {/* Avatar */}
              <div
                className={cn(
                  'w-8 h-8 rounded-full shrink-0 flex items-center justify-center shadow-sm',
                  message.role === 'user'
                    ? 'bg-blue-500'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600'
                )}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Message Bubble */}
              <div
                className={cn(
                  'max-w-[80%] px-4 py-3 rounded-2xl shadow-sm',
                  message.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-md'
                    : 'bg-gradient-to-br from-white to-slate-50/50 border border-slate-200/80 text-slate-700 rounded-tl-md'
                )}
              >
                <div
                  className={cn(
                    'text-sm leading-relaxed prose prose-slate max-w-none',
                    message.role === 'user'
                      ? 'prose-invert'
                      : 'prose-p:my-1 prose-headings:mb-2 prose-headings:mt-4'
                  )}
                >
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
                      code: ({ children }) => (
                        <code className="bg-slate-100 px-1 rounded text-xs font-mono">
                          {children}
                        </code>
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isLoading && <AITutorTyping />}

        {/* Error State */}
        {error && !isLoading && (
          <div className="text-center py-4">
            <p className="text-sm text-red-500">{error.message}</p>
            {error.retryAfter && (
              <button
                onClick={() => setError(null)}
                className="text-xs text-blue-600 hover:underline mt-2"
              >
                Coba lagi
              </button>
            )}
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <AITutorInput
        onSendQuestion={handleSendQuestion}
        isLoading={isLoading}
        error={error}
        lessonTitle={lessonTitle}
      />
    </div>
  )
}
