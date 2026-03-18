import { Star, Trophy } from 'lucide-react';
import { motion } from 'motion/react';
import { Modal, ModalBody, Button } from '@/src/components/ui';

interface BadgeRewardModalProps {
  open: boolean;
  onClose: () => void;
}

export function BadgeRewardModal({ open, onClose }: BadgeRewardModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <ModalBody className="text-center py-8">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Reward Claimed!</h3>
        <p className="text-slate-500 dark:text-slate-400 mb-8">You earned 10 XP for logging in today.</p>

        <div className="relative w-48 h-48 mx-auto mb-8 perspective-1000">
          <motion.div
            animate={{ rotateY: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="w-full h-full preserve-3d"
          >
            <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full shadow-2xl border-4 border-yellow-200">
              <Star className="w-24 h-24 text-white fill-white" />
            </div>
            <div className="absolute inset-0 backface-hidden flex items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full shadow-2xl border-4 border-yellow-300 rotate-y-180">
              <Trophy className="w-24 h-24 text-white fill-white" />
            </div>
          </motion.div>
        </div>

        <Button fullWidth size="lg" onClick={onClose}>
          Tutup
        </Button>
      </ModalBody>
    </Modal>
  );
}
