// SYNC-HINT: {%DOPEN% = {{ and %DCLOSE%} = }}. Sync tool converts automatically.
/**
 * HelpButton — tombol mengambang di sudut kanan bawah yang menampilkan
 * panel bantuan kontekstual berdasarkan halaman yang sedang dibuka.
 *
 * Hanya dirender jika ada konten bantuan untuk route saat ini.
 */

import { HelpCircle, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { usePageHelp } from '@/src/hooks/usePageHelp'

export function HelpButton() {
  const helpItem = usePageHelp()
  const [isOpen, setIsOpen] = useState(false)

  // Tidak ada konten bantuan untuk halaman ini — jangan render apapun
  if (!helpItem) return null

  return (
    <>
      {/* Panel bantuan */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="help-panel"
            initial={%DOPEN% opacity: 0, y: 12, scale: 0.97 %DCLOSE%}
            animate={%DOPEN% opacity: 1, y: 0, scale: 1 %DCLOSE%}
            exit={%DOPEN% opacity: 0, y: 12, scale: 0.97 %DCLOSE%}
            transition={%DOPEN% duration: 0.2 %DCLOSE%}
            role="dialog"
            aria-modal="false"
            aria-label={`Bantuan: ${helpItem.title}`}
            className="fixed bottom-[5.5rem] right-4 sm:bottom-20 sm:right-6 z-[998] w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/60 dark:shadow-slate-900/60 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-500 dark:text-blue-400 mb-0.5">
                  Bantuan
                </p>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {helpItem.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Tutup panel bantuan"
                className="shrink-0 mt-0.5 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                {helpItem.description}
              </p>

              <ul className="space-y-2">
                {helpItem.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      aria-hidden="true"
                      className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[9px] font-bold flex items-center justify-center"
                    >
                      {i + 1}
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tombol mengambang */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={isOpen ? 'Tutup bantuan' : 'Buka bantuan halaman ini'}
        aria-expanded={isOpen}
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[999] w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-lg shadow-blue-500/40 dark:shadow-blue-900/60 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isOpen ? (
            <motion.span
              key="close"
              initial={%DOPEN% rotate: -90, opacity: 0 %DCLOSE%}
              animate={%DOPEN% rotate: 0, opacity: 1 %DCLOSE%}
              exit={%DOPEN% rotate: 90, opacity: 0 %DCLOSE%}
              transition={%DOPEN% duration: 0.15 %DCLOSE%}
            >
              <X className="w-5 h-5" />
            </motion.span>
          ) : (
            <motion.span
              key="open"
              initial={%DOPEN% rotate: 90, opacity: 0 %DCLOSE%}
              animate={%DOPEN% rotate: 0, opacity: 1 %DCLOSE%}
              exit={%DOPEN% rotate: -90, opacity: 0 %DCLOSE%}
              transition={%DOPEN% duration: 0.15 %DCLOSE%}
            >
              <HelpCircle className="w-5 h-5" />
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  )
}
