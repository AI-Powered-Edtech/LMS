import { BookOpen, Calendar, ClipboardList, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '@/contexts/AuthContext'

const WELCOME_KEY = 'edusync_student_welcomed'

export function StudentWelcome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(WELCOME_KEY)) {
      // Small delay so the dashboard loads first
      const timer = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(WELCOME_KEY, '1')
    setShow(false)
  }

  const firstName = profile?.first_name || 'Siswa'

  const actions = [
    {
      icon: <BookOpen className="w-6 h-6 text-blue-500" />,
      title: 'Temukan Kursus',
      desc: 'Jelajahi kursus yang tersedia untukmu',
      path: '/app/student/courses',
      color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/40',
    },
    {
      icon: <ClipboardList className="w-6 h-6 text-amber-500" />,
      title: 'Cek Tugas',
      desc: 'Lihat tugas yang perlu diselesaikan',
      path: '/app/student/assignments',
      color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/40',
    },
    {
      icon: <Calendar className="w-6 h-6 text-emerald-500" />,
      title: 'Lihat Jadwal',
      desc: 'Pantau jadwal kelas dan quiz',
      path: '/calendar',
      color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/40',
    },
  ]

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-8 relative border border-slate-100 dark:border-slate-700"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Tutup sambutan"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Greeting */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Selamat Datang, {firstName}! 🎉
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                EduSync siap membantumu belajar lebih efektif. Mulai dari mana?
              </p>
            </div>

            {/* Quick actions */}
            <div className="space-y-3 mb-6">
              {actions.map((a) => (
                <button
                  key={a.path}
                  onClick={() => {
                    dismiss()
                    navigate(a.path)
                  }}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all hover:scale-[1.01] active:scale-[0.99] ${a.color}`}
                >
                  <div className="shrink-0">{a.icon}</div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {a.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={dismiss}
              className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md"
            >
              Mulai Belajar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
