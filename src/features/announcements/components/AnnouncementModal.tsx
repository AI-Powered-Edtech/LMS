import { cn } from '@/src/utils/cn'

interface AnnouncementModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  className?: string
}

/**
 * Modal dialog untuk Pengumuman.
 */
export function AnnouncementModal({
  isOpen,
  onClose,
  title,
  children,
  className,
}: AnnouncementModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-lg mx-4 rounded-2xl shadow-xl',
          'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700',
          className
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            ✕
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
