/**
 * AI Tutor Typing Indicator
 *
 * Animated loading indicator shown while AI is generating a response.
 */

import { Sparkles } from 'lucide-react'
import { motion } from 'motion/react'

interface AITutorTypingProps {
  message?: string
}

export function AITutorTyping({ message = 'AI sedang berpikir...' }: AITutorTypingProps) {
  return (
    <div className="flex items-start gap-3 p-4">
      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
        <Sparkles className="w-4 h-4 text-white" />
      </div>

      {/* Typing animation */}
      <div className="bg-slate-50 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1">
          <motion.div
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: 0,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: 0.15,
              ease: 'easeInOut',
            }}
          />
          <motion.div
            className="w-2 h-2 bg-slate-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: 0.3,
              ease: 'easeInOut',
            }}
          />
        </div>
      </div>

      {/* Optional message */}
      {message && <span className="text-xs text-slate-400 mt-1">{message}</span>}
    </div>
  )
}
