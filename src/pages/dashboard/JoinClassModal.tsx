import { useState, useEffect } from 'react'
import { CheckCircle2, AlertTriangle, Plus } from 'lucide-react'
import { motion } from 'motion/react'
import { Modal, ModalHeader, ModalBody, Button, Input } from '@/src/components/ui'
import { useForm } from 'react-hook-form'
import { valibotResolver } from '@hookform/resolvers/valibot'
import { FormField } from '@/src/components/ui/FormField'
import * as v from 'valibot'

const JoinClassSchema = v.object({
  code: v.pipe(v.string(), v.minLength(1, 'Wajib diisi')),
})

type JoinClassData = v.InferOutput<typeof JoinClassSchema>

interface JoinClassModalProps {
  open: boolean
  onClose: () => void
  initialCode?: string
  onJoin: (code: string) => Promise<void>
}

export function JoinClassModal({ open, onClose, initialCode = '', onJoin }: JoinClassModalProps) {
  const { control, handleSubmit, reset, watch } = useForm<JoinClassData>({
    resolver: valibotResolver(JoinClassSchema),
    defaultValues: { code: initialCode },
  })
  const code = watch('code')

  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (open) {
      reset({ code: initialCode })
    }
  }, [open, initialCode, reset])

  const onSubmit = async (data: JoinClassData) => {
    const codeToJoin = data.code.trim().toUpperCase()
    if (!codeToJoin) return

    setIsJoining(true)
    setError(null)
    try {
      await onJoin(codeToJoin)
      setSuccess(true)
      setTimeout(() => {
        onClose()
        reset()
        setSuccess(false)
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal bergabung ke kelas')
    } finally {
      setIsJoining(false)
    }
  }

  const handleClose = () => {
    onClose()
    setSuccess(false)
    setError(null)
    reset()
  }

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <ModalHeader title="Gabung Kelas" onClose={handleClose} />
      <ModalBody>
        {success ? (
          <div className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </motion.div>
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Berhasil Bergabung!
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kamu telah ditambahkan ke dalam kelas.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Masukkan kode kelas dari gurumu.
            </p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={control} name="code">
                <Input
                  placeholder="Contoh: XH2K7"
                  className="uppercase font-bold tracking-widest text-center text-lg placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                  autoFocus
                />
              </FormField>
              <Button
                type="submit"
                fullWidth
                loading={isJoining}
                disabled={!code?.trim()}
                icon={<Plus className="w-4 h-4" />}
              >
                {isJoining ? 'Bergabung...' : 'Gabung'}
              </Button>
            </form>
          </>
        )}
      </ModalBody>
    </Modal>
  )
}
