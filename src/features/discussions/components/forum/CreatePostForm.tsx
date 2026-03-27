// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
import { AlertTriangle, EyeOff, Send } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { OptimizedImage } from '@/src/components/ui'
import { checkProfanity, FORUM_CATEGORIES } from '@/src/features/discussions/utils/forumUtils'

interface CreatePostFormProps {
  onSubmit: (data: { title: string; content: string; category: string; isAnon: boolean }) => void
  isPending: boolean
  avatar: string
  isAnonymous: boolean
  onAnonymousChange: (checked: boolean) => void
}

export function CreatePostForm({
  onSubmit,
  isPending,
  avatar,
  isAnonymous,
  onAnonymousChange,
}: CreatePostFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('Umum')
  const [profanityWarning, setProfanityWarning] = useState(false)

  const handlePost = () => {
    if (!title.trim() || !content.trim()) return

    if (checkProfanity(title) || checkProfanity(content)) {
      setProfanityWarning(true)
      setTimeout(() => setProfanityWarning(false), 3000)
      return
    }

    onSubmit({ title, content, category, isAnon: isAnonymous })
    setTitle('')
    setContent('')
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
      <div className="flex gap-4">
        <OptimizedImage
          src={avatar}
          alt=""
          className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 shrink-0 hidden sm:block"
        />
        <div className="flex-1 space-y-4">
          <div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Judul pertanyaan..."
              className="w-full bg-transparent border-b border-slate-200 dark:border-slate-600 pb-2 text-lg font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Jelaskan pertanyaanmu secara detail... (Mendukung Markdown & LaTeX: $$x^2$$)"
            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-2xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all resize-y text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />

          <AnimatePresence>
            {profanityWarning && (
              <motion.div
                initial={%DOPEN% opacity: 0, height: 0 %DCLOSE%}
                animate={%DOPEN% opacity: 1, height: 'auto' %DCLOSE%}
                exit={%DOPEN% opacity: 0, height: 0 %DCLOSE%}
                className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 border border-red-200 dark:border-red-800"
              >
                <AlertTriangle className="w-4 h-4" />
                Pesan Anda mengandung kata-kata yang tidak pantas. Harap gunakan bahasa yang sopan.
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                {FORUM_CATEGORIES.filter((c) => c !== 'Semua').map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer hover:text-slate-900 dark:hover:text-slate-200">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => onAnonymousChange(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <EyeOff className="w-4 h-4" /> Tanya Anonim
              </label>
            </div>

            <button
              onClick={handlePost}
              disabled={!title.trim() || !content.trim() || isPending}
              className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700 dark:disabled:text-slate-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <Send className="w-4 h-4" />
              {isPending ? 'Memposting...' : 'Posting Pertanyaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
