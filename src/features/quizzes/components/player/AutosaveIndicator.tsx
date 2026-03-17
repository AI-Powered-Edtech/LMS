import { Loader2, Check, AlertCircle, WifiOff } from 'lucide-react';
import { cn } from '@/src/utils/cn';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutosaveIndicatorProps {
  status: SaveStatus;
}

export function AutosaveIndicator({ status }: AutosaveIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
      status === 'saving' && "bg-slate-100 text-slate-600",
      status === 'saved' && "bg-green-50 text-green-700",
      status === 'error' && "bg-red-50 text-red-700",
      status === 'offline' && "bg-amber-50 text-amber-700"
    )}>
      {status === 'saving' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Menyimpan...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-4 h-4" />
          <span>Tersimpan</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4" />
          <span>Gagal menyimpan</span>
        </>
      )}
      {status === 'offline' && (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline — jawaban tersimpan lokal</span>
        </>
      )}
    </div>
  );
}
