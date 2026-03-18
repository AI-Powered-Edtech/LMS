import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Plus } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input } from '@/src/components/ui';

interface JoinClassModalProps {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  onJoin: (code: string) => Promise<void>;
}

export function JoinClassModal({ open, onClose, initialCode = '', onJoin }: JoinClassModalProps) {
  const [code, setCode] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsJoining(true);
    setError(null);
    try {
      await onJoin(code.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose();
        setCode('');
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Gagal bergabung ke kelas');
    } finally {
      setIsJoining(false);
    }
  };

  const handleClose = () => {
    onClose();
    setSuccess(false);
    setError(null);
  };

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
            <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Berhasil Bergabung!</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">Kamu telah ditambahkan ke dalam kelas.</p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Masukkan kode kelas dari gurumu.</p>
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl flex items-start gap-2 border border-red-100 dark:border-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Contoh: XH2K7"
                className="uppercase font-bold tracking-widest text-center text-lg placeholder:font-normal placeholder:normal-case placeholder:tracking-normal"
                autoFocus
              />
              <Button
                type="submit"
                fullWidth
                loading={isJoining}
                disabled={!code.trim()}
                icon={<Plus className="w-4 h-4" />}
              >
                {isJoining ? 'Bergabung...' : 'Gabung'}
              </Button>
            </form>
          </>
        )}
      </ModalBody>
    </Modal>
  );
}
