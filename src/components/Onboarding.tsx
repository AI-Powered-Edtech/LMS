import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, ArrowRight, Target, Trophy, Users } from 'lucide-react'
import { useAuth } from '@/src/contexts/AuthContext'

export function Onboarding() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)
  const { role } = useAuth()

  useEffect(() => {
    if (!role) return // Wait for auth to resolve before checking
    const hasOnboarded = localStorage.getItem(`onboarded_${role}`)
    setIsOpen(!hasOnboarded)
  }, [role])

  const handleComplete = () => {
    localStorage.setItem(`onboarded_${role}`, 'true')
    setIsOpen(false)
  }

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
      title: 'AI Creator',
      description: 'Buat materi, kuis, dan RPP secara otomatis dengan bantuan AI Creator kami.',
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

  if (!isOpen) return null

  const currentStep = steps[step]
  const Icon = currentStep.icon

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          <div className="p-8 text-center">
            <div
              className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${currentStep.bg}`}
            >
              <Icon className={`w-10 h-10 ${currentStep.color}`} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">{currentStep.title}</h2>
            <p className="text-slate-600 leading-relaxed">{currentStep.description}</p>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <div className="flex gap-2">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === step ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            <button
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
