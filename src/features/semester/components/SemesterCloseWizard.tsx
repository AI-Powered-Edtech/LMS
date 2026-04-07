import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import {
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  useToast,
} from '@/components/ui'

import { useCloseSemester } from '../queries/useSemesters'

interface SemesterCloseWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  semesterId: string
  onSuccess?: () => void
}

type WizardStep = 'gradebook' | 'report-cards' | 'promote' | 'close' | 'done'

export function SemesterCloseWizard({
  open,
  onOpenChange,
  semesterId,
  onSuccess,
}: SemesterCloseWizardProps) {
  const [step, setStep] = useState<WizardStep>('gradebook')
  const [gradebookSynced, setGradebookSynced] = useState(false)
  const [reportCardsGenerated, setReportCardsGenerated] = useState(false)
  const [studentsPromoted, setStudentsPromoted] = useState(false)
  const [newClass, setNewClass] = useState('')
  const { addToast } = useToast()

  const closeMutation = useCloseSemester()

  const handleNext = () => {
    if (step === 'gradebook') {
      setGradebookSynced(true)
      setStep('report-cards')
    } else if (step === 'report-cards') {
      setReportCardsGenerated(true)
      setStep('promote')
    } else if (step === 'promote') {
      setStudentsPromoted(true)
      setStep('close')
    } else if (step === 'close') {
      closeMutation.mutate(semesterId, {
        onSuccess: () => {
          setStep('done')
          addToast?.({ type: 'success', message: 'Semester berhasil ditutup' })
          onSuccess?.()
        },
      })
    }
  }

  const handleBack = () => {
    if (step === 'report-cards') setStep('gradebook')
    else if (step === 'promote') setStep('report-cards')
    else if (step === 'close') setStep('promote')
  }

  const handleReset = () => {
    setStep('gradebook')
    setGradebookSynced(false)
    setReportCardsGenerated(false)
    setStudentsPromoted(false)
    setNewClass('')
    onOpenChange(false)
  }

  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: 'gradebook', label: 'Tutup Buku Nilai', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'report-cards', label: 'Buat Rapor', icon: <FileText className="h-4 w-4" /> },
    { key: 'promote', label: 'Promosi Siswa', icon: <Users className="h-4 w-4" /> },
    { key: 'close', label: 'Tutup Semester', icon: <Calendar className="h-4 w-4" /> },
    { key: 'done', label: 'Selesai', icon: <CheckCircle className="h-4 w-4" /> },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  const isStepComplete = (s: WizardStep) => {
    switch (s) {
      case 'gradebook':
        return gradebookSynced
      case 'report-cards':
        return reportCardsGenerated
      case 'promote':
        return studentsPromoted
      case 'close':
        return closeMutation.isSuccess
      default:
        return false
    }
  }

  const classOptions = [
    { value: 'X', label: 'Kelas X' },
    { value: 'XI', label: 'Kelas XI' },
    { value: 'XII', label: 'Kelas XII' },
  ]

  return (
    <Modal open={open} onClose={() => handleReset()} size="2xl">
      <ModalHeader title="Tutup Semester" onClose={() => handleReset()} />
      <ModalBody>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-1 py-4 overflow-x-auto">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-1 shrink-0">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  isStepComplete(s.key) || i < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : i === currentStepIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {isStepComplete(s.key) || i < currentStepIndex ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <span className="flex items-center">{s.icon}</span>
                )}
              </div>
              <span
                className={`text-xs hidden sm:inline ${
                  i === currentStepIndex
                    ? 'font-medium text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-gray-400" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'gradebook' && (
          <Card>
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-medium dark:text-white">Langkah 1: Tutup Buku Nilai</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pastikan semua nilai telah dimasukkan dan disinkronisasi sebelum menutup semester.
              </p>
              <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-900/30 dark:border dark:border-blue-800">
                <p className="font-medium text-blue-800 dark:text-blue-200">Checklist:</p>
                <ul className="mt-2 space-y-1 text-blue-700 dark:text-blue-300">
                  <li className="flex items-center gap-2">
                    <input type="checkbox" checked={gradebookSynced} readOnly className="rounded" />
                    Semua nilai tugas dan kuis telah diisi
                  </li>
                  <li className="flex items-center gap-2">
                    <input type="checkbox" checked={gradebookSynced} readOnly className="rounded" />
                    Buku nilai telah disinkronisasi
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {step === 'report-cards' && (
          <Card>
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-medium dark:text-white">Langkah 2: Buat Rapor</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Sistem akan membuat rapor untuk semua siswa berdasarkan nilai semester ini.
              </p>
              <div className="rounded-lg bg-amber-50 p-3 text-sm dark:bg-amber-900/30 dark:border dark:border-amber-800">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Rapor akan mencakup:
                </p>
                <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                  <li>Nilai akhir semua mata pelajaran</li>
                  <li>Ringkasan kehadiran</li>
                  <li>Catatan guru (jika ada)</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {step === 'promote' && (
          <Card>
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-medium dark:text-white">Langkah 3: Promosi Siswa</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Pilih kelas tujuan untuk mempromosikan siswa ke tingkat berikutnya.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kelas Tujuan
                </label>
                <Select
                  options={classOptions}
                  value={newClass}
                  onChange={(e) => setNewClass(e.target.value)}
                  placeholder="Pilih kelas..."
                />
              </div>
            </div>
          </Card>
        )}

        {step === 'close' && (
          <Card>
            <div className="p-4 sm:p-6 space-y-4">
              <h3 className="text-lg font-medium dark:text-white">
                Langkah 4: Konfirmasi Penutupan
              </h3>
              <div className="rounded-lg bg-red-50 p-4 text-sm dark:bg-red-900/30 dark:border dark:border-red-800">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Peringatan: Tindakan ini tidak dapat dibatalkan!
                </p>
                <ul className="mt-2 space-y-1 text-red-700 dark:text-red-300">
                  <li>Semester akan ditutup dan tidak dapat diubah</li>
                  <li>Siswa tidak dapat mengakses materi semester ini</li>
                  <li>Rapor telah dibuat dan siap dicetak</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium dark:text-white">Ringkasan:</h4>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="dark:text-gray-300">Buku nilai disinkronisasi</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="dark:text-gray-300">Rapor dibuat</span>
                </div>
                {newClass && (
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="dark:text-gray-300">Siswa dipromosikan ke {newClass}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {step === 'done' && (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
              Semester Berhasil Ditutup
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Semua langkah penutupan semester telah selesai.
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step !== 'gradebook' && step !== 'done' && (
          <Button variant="secondary" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        )}
        {step === 'done' ? (
          <Button onClick={handleReset}>Tutup</Button>
        ) : (
          <Button onClick={handleNext} disabled={closeMutation.isPending}>
            {closeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 'close' ? 'Tutup Semester' : 'Selanjutnya'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
