import { AlertTriangle } from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, EmptyState } from '@/src/components/ui'

interface QuizHistoryModalProps {
  open: boolean
  onClose: () => void
}

export function QuizHistoryModal({ open, onClose }: QuizHistoryModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <ModalHeader title="Riwayat Kuis" onClose={onClose} />
      <ModalBody>
        <EmptyState
          icon={<AlertTriangle className="w-12 h-12" />}
          title="Belum ada riwayat kuis"
          description="Riwayat kuis akan muncul setelah kamu menyelesaikan kuis pertamamu."
        />
      </ModalBody>
      <ModalFooter>
        <Button onClick={onClose}>Tutup</Button>
      </ModalFooter>
    </Modal>
  )
}
