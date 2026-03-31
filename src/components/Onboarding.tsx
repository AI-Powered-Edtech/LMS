import { ArrowRight, Sparkles, Target, Trophy, Users, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/contexts/AuthContext'

export function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const { role } = useAuth()
  const hasCheckedRef = useRef(false)

  useEffect(() => {
    if (!role) return // Wait for auth to resolve before checking
    // Only check once per component lifecycle to prevent re-showing on re-mount
    if (hasCheckedRef.current) return
    hasCheckedRef.current = true
    const hasOnboarded = localStorage.getItem(`onboarded_${role}`)
    setIsOpen(!hasOnboarded)
  }, [role])

  const handleComplete = useCallback(() => {
    if (!role) return // Guard: don't set localStorage with undefined role
    localStorage.setItem(`onboarded_${role}`, 'true')
    setIsOpen(false)
  }, [role])

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleComplete()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleComplete])

  const studentSteps = [
    {
      title: 'Selamat Datang di EduSync!',
      description: 'Platform pembelajaran cerdas yang menyesuaikan dengan gaya belajarmu.',
      icon: Sparkles,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
    },
    {
      title: 'Peta Pembelajaran',
      description:
        'Ikuti jalur pembelajaran yang dirancang khusus untukmu. Selesaikan materi untuk membuka level berikutnya.',
      icon: Target,
      color: 'text-green-500',
      bg: 'bg-green-100',
    },
    {
      title: 'Kumpulkan XP & Bersaing',
      description:
        'Dapatkan XP dari setiap kuis dan tugas. Jadilah yang terbaik di Leaderboard kelasmu!',
      icon: Trophy,
      color: 'text-yellow-500',
      bg: 'bg-yellow-100',
    },
  ]

  const teacherSteps = [
    {
      title: 'Selamat Datang, Guru!',
      description: 'Kelola kelas dan pantau perkembangan siswa dengan bantuan AI.',
      icon: Sparkles,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
    },
    {
      title: 'Kreator AI',
      description: 'Buat materi, kuis, dan RPP secara otomatis dengan bantuan Kreator AI kami.',
      icon: Target,
      color: 'text-purple-500',
      bg: 'bg-purple-100',
    },
    {
      title: 'Pantau & Evaluasi',
      description: 'Lihat analitik kelas, nilai tugas dengan cepat, dan berinteraksi di forum.',
      icon: Users,
      color: 'text-orange-500',
      bg: 'bg-orange-100',
    },
  ]

  const steps = role === 'teacher' ? teacherSteps : studentSteps

  if (!isOpen || !role) return null

  const currentStep = steps[step]
  const Icon = currentStep.icon

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={handleComplete}
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={handleComplete}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-10"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-8 text-center">
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${currentStep.bg}`}
            >
              <Icon className={`w-10 h-10 ${currentStep.color}`} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
              {currentStep.title}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              {currentStep.description}
            </p>
          </div>

          <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i === step ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />
                ))}
              </div>
              {step < steps.length - 1 && (
                <button
                  type="button"
                  onClick={handleComplete}
                  className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  Lewati
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (step < steps.length - 1) {
                  setStep(step + 1)
                } else {
                  handleComplete()
                }
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              {step < steps.length - 1 ? (
                <>
                  Lanjut <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                'Mulai Sekarang'
              )}
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
