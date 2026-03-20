import { motion } from 'motion/react';
import { Star } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useStudentXPProfile } from '../queries/gamificationQueries';
import { getLevelTier } from './LevelBadge';
import { LEVEL_THRESHOLDS } from '../types';

interface XPProgressBarProps {
    compact?: boolean;
}

export function XPProgressBar({ compact }: XPProgressBarProps) {
    const { data: profile } = useStudentXPProfile();

    const totalXP = profile?.total_xp ?? 0;
    const level = profile?.level ?? 1;
    const xpCurrent = profile?.xp_current_level ?? 0;
    const xpNext = profile?.xp_next_level ?? (LEVEL_THRESHOLDS[1] ?? 100);

    const xpInLevel = totalXP - xpCurrent;
    const xpNeeded = xpNext - xpCurrent;
    const progress = xpNeeded > 0 ? Math.min(1, xpInLevel / xpNeeded) : 1;
    const progressPct = Math.round(progress * 100);

    const { label, color } = getLevelTier(level);

    if (compact) {
        return (
            <div className="flex items-center gap-2">
                <span className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-sm',
                    color,
                )}>
                    Lv {level}
                </span>
                <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                        className={cn('h-full rounded-full', color)}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                </div>
                <span className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500">
                    {totalXP} XP
                </span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Level {level}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">— {label}</span>
                </div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {xpInLevel} / {xpNeeded} XP
                </span>
            </div>

            <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    className={cn('h-full rounded-full', color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
            </div>

            {level < 10 && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Butuh <strong className="text-yellow-600">{xpNeeded - xpInLevel} XP</strong> lagi untuk Level {level + 1}
                </p>
            )}
        </div>
    );
}
