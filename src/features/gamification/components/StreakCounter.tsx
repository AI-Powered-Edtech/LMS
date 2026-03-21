import { useMemo } from 'react';
import { motion } from 'motion/react';
import { Flame } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useStudentXPProfile } from '../queries/gamificationQueries';
import { calculateStreak } from '@/src/utils/clientCompute';

interface StreakCounterProps {
    compact?: boolean;
}

export function StreakCounter({ compact }: StreakCounterProps) {
    const { data: profile } = useStudentXPProfile();

    // Optimistic streak: if server streak is 0 but user has XP activity today,
    // the 30-min cron may not have run yet — compute locally from recent_xp timestamps
    const optimisticStreak = useMemo(() => {
        if (!profile?.recent_xp || profile.streak_current > 0) return profile?.streak_current ?? 0;
        const completions = profile.recent_xp.map(t => ({ completed_at: t.created_at }));
        return calculateStreak(completions).current;
    }, [profile]);

    const streak = optimisticStreak;
    const longest = profile?.streak_longest ?? 0;
    const isActive = streak > 0;

    if (compact) {
        return (
            <div className="flex items-center gap-1.5">
                <Flame className={cn(
                    'h-5 w-5',
                    isActive
                        ? 'text-orange-500 fill-orange-500'
                        : 'text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600',
                )} />
                <span className={cn(
                    'font-bold text-sm',
                    isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500',
                )}>
                    {streak}
                </span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <motion.div
                animate={isActive ? {
                    scale: [1, 1.1, 1],
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                className={cn(
                    'flex items-center justify-center rounded-xl p-2.5',
                    isActive
                        ? 'bg-orange-100 dark:bg-orange-900/30'
                        : 'bg-slate-100 dark:bg-slate-800',
                )}
            >
                <Flame className={cn(
                    'h-6 w-6',
                    isActive
                        ? 'text-orange-500 fill-orange-500'
                        : 'text-slate-300 dark:text-slate-600 fill-slate-300 dark:fill-slate-600',
                )} />
            </motion.div>

            <div>
                <div className="flex items-baseline gap-1">
                    <span className={cn(
                        'text-xl font-black',
                        isActive ? 'text-orange-600 dark:text-orange-400' : 'text-slate-400 dark:text-slate-500',
                    )}>
                        {streak}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        hari berturut-turut
                    </span>
                </div>
                {longest > 0 && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        Terpanjang: {longest} hari
                    </p>
                )}
            </div>
        </div>
    );
}
