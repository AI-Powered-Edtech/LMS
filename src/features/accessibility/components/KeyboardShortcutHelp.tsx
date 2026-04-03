import { Keyboard, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'

const SHORTCUTS = [
  {
    group: 'Navigasi',
    items: [
      { keys: ['Alt', '←'], description: 'Pelajaran sebelumnya' },
      { keys: ['Alt', '→'], description: 'Pelajaran berikutnya' },
      { keys: ['Alt', 'T'], description: 'Buka AI Tutor' },
      { keys: ['Escape'], description: 'Tutup modal/panel' },
    ],
  },
  {
    group: 'Aksesibilitas',
    items: [
      { keys: ['Shift', '?'], description: 'Tampilkan pintasan keyboard' },
      { keys: ['Alt', 'H'], description: 'Toggle kontras tinggi' },
    ],
  },
  {
    group: 'Materi',
    items: [
      { keys: ['Space', 'Enter'], description: 'Pilih/Konfirmasi' },
      { keys: ['Tab'], description: 'Fokus berikutnya' },
      { keys: ['Shift', 'Tab'], description: 'Fokus sebelumnya' },
    ],
  },
]

export function KeyboardShortcutHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.shiftKey && e.key === '?') {
        e.preventDefault()
        setIsOpen((v) => !v)
      }
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Tampilkan pintasan keyboard (Shift+?)"
        title="Pintasan keyboard (Shift+?)"
        className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <Keyboard className="h-4 w-4" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcuts-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-6 max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2
                  id="shortcuts-title"
                  className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2"
                >
                  <Keyboard className="h-5 w-5" aria-hidden="true" />
                  Pintasan Keyboard
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  aria-label="Tutup"
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <dl className="space-y-4">
                {SHORTCUTS.map((group) => (
                  <div key={group.group}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      {group.group}
                    </dt>
                    <dd>
                      <ul className="space-y-1.5">
                        {group.items.map((item) => (
                          <li key={item.description} className="flex items-center justify-between">
                            <span className="text-sm text-slate-700 dark:text-slate-300">
                              {item.description}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.keys.map((key) => (
                                <kbd
                                  key={key}
                                  className="px-2 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600"
                                >
                                  {key}
                                </kbd>
                              ))}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
                Tekan{' '}
                <kbd className="px-1 py-0.5 text-xs font-mono bg-slate-100 dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600">
                  Shift+?
                </kbd>{' '}
                untuk membuka/menutup panel ini
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
