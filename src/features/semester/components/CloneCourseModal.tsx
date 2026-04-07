import { Loader2 } from 'lucide-react'
import { useState } from 'react'

import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Select,
  useToast,
} from '@/components/ui'

import { useCloneCourseToSemester, useSemesters } from '../queries/useSemesters'

interface CloneCourseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  onSuccess?: () => void
}

export function CloneCourseModal({
  open,
  onOpenChange,
  courseId,
  onSuccess,
}: CloneCourseModalProps) {
  const { data: semesters } = useSemesters()
  const cloneMutation = useCloneCourseToSemester()
  const [targetSemesterId, setTargetSemesterId] = useState('')
  const { addToast } = useToast()

  const activeSemesters =
    semesters?.filter((s) => s.status === 'active' || s.status === 'draft') ?? []

  const semesterOptions = activeSemesters.map((s) => ({
    value: s.id,
    label: `${s.name} (${s.academic_year})`,
  }))

  const handleClone = () => {
    if (!targetSemesterId) return
    cloneMutation.mutate(
      { courseId, targetSemesterId },
      {
        onSuccess: () => {
          setTargetSemesterId('')
          onOpenChange(false)
          addToast?.({ type: 'success', message: 'Kursus berhasil disalin' })
          onSuccess?.()
        },
      }
    )
  }

  const handleClose = () => {
    setTargetSemesterId('')
    onOpenChange(false)
  }

  return (
    <Modal open={open} onClose={handleClose} size="md">
      <ModalHeader title="Salin Kursus ke Semester" onClose={handleClose} />
      <ModalBody>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Semester Tujuan
            </label>
            <Select
              options={semesterOptions}
              value={targetSemesterId}
              onChange={(e) => setTargetSemesterId(e.target.value)}
              placeholder="Pilih semester"
            />
          </div>

          <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 dark:border dark:border-amber-800">
            <p className="font-medium">Perhatian:</p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>Struktur kursus (modul, materi, kuis) akan disalin</li>
              <li>Data pendaftaran dan progres siswa tidak akan disalin</li>
              <li>Kursus baru akan dibuat dengan status draf</li>
            </ul>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={handleClose}>
          Batal
        </Button>
        <Button onClick={handleClone} disabled={!targetSemesterId || cloneMutation.isPending}>
          {cloneMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salin Kursus
        </Button>
      </ModalFooter>
    </Modal>
  )
}
