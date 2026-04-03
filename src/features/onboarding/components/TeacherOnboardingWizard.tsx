import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

import { useTeacherOnboarding } from '../hooks/useTeacherOnboarding'
import {
  StepCreateClass,
  StepCreateCourse,
  StepInviteStudents,
  StepReady,
  StepWelcome,
} from './steps'

/* ─── Main Wizard Component ──────────────────────────────────── */

export function TeacherOnboardingWizard() {
  const [showDismissConfirm, setShowDismissConfirm] = useState(false)

  const {
    isVisible,
    currentStep,
    totalSteps,
    completedSteps,
    createdClassId,
    createdClassJoinCode,
    createdCourseId,
    isLoading,
    nextStep,
    prevStep,
    completeStep,
    completeOnboarding,
    dismissForever,
    saveClassResult,
    saveCourseResult,
  } = useTeacherOnboarding()

  if (isLoading || !isVisible) return null

  async function handleNext() {
    await completeStep(currentStep)
    await nextStep()
  }

  async function handleSkip() {
    await nextStep()
  }

  async function handleClassCreated(classId: string, joinCode: string) {
    await saveClassResult(classId, joinCode)
    await completeStep(2)
  }

  async function handleCourseCreated(courseId: string) {
    await saveCourseResult(courseId)
    await completeStep(4)
  }

  async function handleFinish() {
    await completeOnboarding()
  }

  async function handleDismissConfirmed() {
    await dismissForever()
    setShowDismissConfirm(false)
  }

  const progressPercent = Math.round(((currentStep - 1) / (totalSteps - 1)) * 100)

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={() => setShowDismissConfirm(true)}
      >
        {/* Modal panel */}
        <motion.div
          key="panel"
          initial={{ scale: 0.92, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.92, y: 24, opacity: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 dark:border-slate-700 overflow-hidden"
        >
          {/* Top bar: progress + close */}
          <div className="px-6 pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                Langkah {currentStep} dari {totalSteps}
              </span>
              <button
                onClick={() => setShowDismissConfirm(true)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Tutup panduan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
              />
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {Array.from({ length: totalSteps }, (_, i) => {
                const stepNum = i + 1
                const isDone = completedSteps.includes(stepNum)
                const isCurrent = stepNum === currentStep
                return (
                  <div
                    key={stepNum}
                    className={cn(
                      'rounded-full transition-all duration-300',
                      isCurrent
                        ? 'w-6 h-2 bg-indigo-500'
                        : isDone
                          ? 'w-2 h-2 bg-emerald-400'
                          : 'w-2 h-2 bg-slate-200 dark:bg-slate-700'
                    )}
                  />
                )
              })}
            </div>
          </div>

          {/* Step content */}
          <div className="px-6 pb-6 max-h-[65vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -30, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                {currentStep === 1 && <StepWelcome onNext={handleNext} />}
                {currentStep === 2 && (
                  <StepCreateClass
                    onNext={() => {
                      completeStep(2)
                      nextStep()
                    }}
                    onSkip={handleSkip}
                    onClassCreated={handleClassCreated}
                    existingClassId={createdClassId}
                    existingJoinCode={createdClassJoinCode}
                  />
                )}
                {currentStep === 3 && (
                  <StepInviteStudents onNext={handleNext} joinCode={createdClassJoinCode} />
                )}
                {currentStep === 4 && (
                  <StepCreateCourse
                    onNext={() => {
                      completeStep(4)
                      nextStep()
                    }}
                    onSkip={handleSkip}
                    onCourseCreated={handleCourseCreated}
                    existingCourseId={createdCourseId}
                  />
                )}
                {currentStep === 5 && (
                  <StepReady
                    completedSteps={completedSteps}
                    createdClassId={createdClassId}
                    createdCourseId={createdCourseId}
                    onFinish={handleFinish}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Back button (steps 2-4) */}
          {currentStep > 1 && currentStep < 5 && (
            <div className="px-6 pb-4 -mt-2">
              <button
                onClick={prevStep}
                className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                ← Kembali
              </button>
            </div>
          )}
        </motion.div>

        {/* Dismiss confirmation overlay */}
        <AnimatePresence>
          {showDismissConfirm && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-6 max-w-sm w-full text-center">
                <p className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  Yakin ingin melewati panduan ini?
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                  Panduan ini tidak akan muncul lagi. Anda tetap bisa mengatur kelas dan materi
                  secara manual.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowDismissConfirm(false)}
                  >
                    Lanjutkan
                  </Button>
                  <Button variant="danger" className="flex-1" onClick={handleDismissConfirmed}>
                    Ya, Lewati
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  )
}
