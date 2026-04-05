import { CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useState } from 'react'

import {
  Button,
  EmptyState,
  Input,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  useToast,
} from '@/components/ui'
import { Badge } from '@/components/ui'

import { usePromoteStudents } from '../queries/useSemesters'

interface Student {
  id: string
  name: string
  email: string
  current_class: string
}

interface BulkPromoteWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  students: Student[]
  availableClasses: string[]
  onSuccess?: () => void
}

type WizardStep = 'select-students' | 'select-class' | 'confirm' | 'done'

export function BulkPromoteWizard({
  open,
  onOpenChange,
  students,
  availableClasses,
  onSuccess,
}: BulkPromoteWizardProps) {
  const [step, setStep] = useState<WizardStep>('select-students')
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [newClass, setNewClass] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const { addToast } = useToast()

  const promoteMutation = usePromoteStudents()

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelectedStudentIds(next)
  }

  const toggleAll = () => {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  const handleNext = () => {
    if (step === 'select-students' && selectedStudentIds.size > 0) {
      setStep('select-class')
    } else if (step === 'select-class' && newClass) {
      setStep('confirm')
    } else if (step === 'confirm') {
      handlePromote()
    }
  }

  const handleBack = () => {
    if (step === 'select-class') setStep('select-students')
    else if (step === 'confirm') setStep('select-class')
  }

  const handlePromote = () => {
    promoteMutation.mutate(
      { studentIds: Array.from(selectedStudentIds), newClass },
      {
        onSuccess: () => {
          setStep('done')
          addToast?.({
            type: 'success',
            message: `${selectedStudentIds.size} siswa berhasil dipromosikan`,
          })
          onSuccess?.()
        },
      }
    )
  }

  const handleReset = () => {
    setStep('select-students')
    setSelectedStudentIds(new Set())
    setNewClass('')
    setSearchTerm('')
    onOpenChange(false)
  }

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'select-students', label: 'Pilih Siswa' },
    { key: 'select-class', label: 'Pilih Kelas' },
    { key: 'confirm', label: 'Konfirmasi' },
    { key: 'done', label: 'Selesai' },
  ]

  const currentStepIndex = steps.findIndex((s) => s.key === step)

  const classOptions = availableClasses.map((c) => ({ value: c, label: c }))

  return (
    <Modal open={open} onClose={() => handleReset()} size="2xl">
      <ModalHeader title="Promosi Siswa Massal" onClose={() => handleReset()} />
      <ModalBody>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                  i < currentStepIndex
                    ? 'bg-green-500 text-white'
                    : i === currentStepIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {i < currentStepIndex ? <CheckCircle className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`text-sm ${
                  i === currentStepIndex
                    ? 'font-medium text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 'select-students' && (
          <div className="space-y-4">
            <Input
              placeholder="Cari siswa berdasarkan nama atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-2 w-10">
                      <input
                        type="checkbox"
                        checked={
                          filteredStudents.length > 0 &&
                          selectedStudentIds.size === filteredStudents.length
                        }
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Nama
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Email
                    </th>
                    <th className="text-left py-2 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Kelas Saat Ini
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="border-b dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => toggleStudent(student.id)}
                    >
                      <td className="py-2 px-2">
                        <input
                          type="checkbox"
                          checked={selectedStudentIds.has(student.id)}
                          onChange={() => toggleStudent(student.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="py-2 px-2 font-medium dark:text-gray-200">{student.name}</td>
                      <td className="py-2 px-2 dark:text-gray-300">{student.email}</td>
                      <td className="py-2 px-2">
                        <Badge>{student.current_class}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStudents.length === 0 && (
              <EmptyState title="Tidak ada siswa" description="Coba ubah kata kunci pencarian." />
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {selectedStudentIds.size} siswa dipilih
            </p>
          </div>
        )}

        {step === 'select-class' && (
          <div className="space-y-4">
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
            <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 dark:border dark:border-blue-800">
              <p className="font-medium">Ringkasan:</p>
              <p>
                {selectedStudentIds.size} siswa akan dipindahkan ke kelas {newClass || '...'}
              </p>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-amber-50 p-4 text-sm dark:bg-amber-900/30 dark:border dark:border-amber-800">
              <p className="font-medium text-amber-800 dark:text-amber-200">Konfirmasi Promosi</p>
              <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                <li>
                  <strong>Jumlah siswa:</strong> {selectedStudentIds.size}
                </li>
                <li>
                  <strong>Kelas tujuan:</strong> {newClass}
                </li>
              </ul>
              <p className="mt-2 text-amber-600 dark:text-amber-400">
                Tindakan ini akan mengubah kelas siswa secara permanen.
              </p>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div className="py-8 text-center">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Promosi Berhasil
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {selectedStudentIds.size} siswa berhasil dipindahkan ke kelas {newClass}.
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step !== 'select-students' && step !== 'done' && (
          <Button variant="secondary" onClick={handleBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Kembali
          </Button>
        )}
        {step === 'done' ? (
          <Button onClick={handleReset}>Tutup</Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={
              (step === 'select-students' && selectedStudentIds.size === 0) ||
              (step === 'select-class' && !newClass) ||
              promoteMutation.isPending
            }
          >
            {promoteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === 'confirm' ? 'Proses Promosi' : 'Selanjutnya'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
