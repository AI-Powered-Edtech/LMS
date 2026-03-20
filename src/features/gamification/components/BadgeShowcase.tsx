import { motion } from 'motion/react';
import { Award, Lock } from 'lucide-react';
import { cn } from '@/src/utils/cn';
import { useStudentBadges } from '../queries/gamificationQueries';
import { RARITY_CONFIG } from '../types';
import type { BadgeDefinition, BadgeRarity } from '../types';
import { SkeletonCard } from '@/src/components/ui';

interface BadgeShowcaseProps {
    compact?: boolean;
}

function BadgeCard({ badge, compact }: { badge: BadgeDefinition; compact?: boolean }) {
    const rarity = RARITY_CONFIG[badge.rarity as BadgeRarity] ?? RARITY_CONFIG.common;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={cn(
                'relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-shadow',
                rarity.border,
                badge.is_earned
                    ? `${rarity.bg} shadow-sm hover:shadow-md`
                    : 'bg-slate-50 dark:bg-slate-800/50 opacity-60 grayscale',
                compact && 'p-2 gap-1',
            )}
        >
            {/* Rarity indicator */}
            {badge.is_earned && badge.rarity !== 'common' && (
                <span className={cn(
                    'absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white',
                    badge.rarity === 'rare' && 'bg-blue-500',
                    badge.rarity === 'epic' && 'bg-purple-500',
                    badge.rarity === 'legendary' && 'bg-gradient-to-r from-yellow-400 to-amber-500',
                )}>
                    {rarity.label}
                </span>
            )}

            {/* Badge emoji */}
            <div className={cn(
                'flex items-center justify-center rounded-full',
                compact ? 'h-10 w-10 text-xl' : 'h-14 w-14 text-3xl',
                badge.is_earned ? '' : 'relative',
            )}>
                <span>{badge.icon_emoji}</span>
                {!badge.is_earned && (
                    <Lock className="absolute bottom-0 right-0 h-3.5 w-3.5 text-slate-400" />
                )}
            </div>

            {/* Name */}
            <h4 className={cn(
                'font-bold leading-tight',
                compact ? 'text-[10px]' : 'text-xs',
                badge.is_earned ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500',
            )}>
                {badge.name}
            </h4>

            {!compact && (
                <>
                    <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-2">
                        {badge.is_earned ? badge.description : criteriaHint(badge)}
                    </p>

                    {badge.is_earned && badge.earned_at && (
                        <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                            Diraih {new Date(badge.earned_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </span>
                    )}

                    {badge.xp_reward > 0 && (
                        <span className="text-[9px] font-bold text-yellow-600">+{badge.xp_reward} XP</span>
                    )}
                </>
            )}
        </motion.div>
    );
}

function criteriaHint(badge: BadgeDefinition): string {
    const c = badge.criteria as Record<string, unknown>;
    switch (c.type) {
        case 'lessons_completed': return `Selesaikan ${c.threshold} pelajaran`;
        case 'streak_days': return `Streak ${c.threshold} hari`;
        case 'quiz_perfect_score': return `${c.threshold} nilai sempurna`;
        case 'course_completed': return 'Selesaikan 1 kursus';
        case 'courses_completed': return `Selesaikan ${c.threshold} kursus`;
        case 'course_master': return 'Kursus dengan rata-rata ≥ 90%';
        case 'speed_learner': return 'Selesaikan pelajaran lebih cepat';
        default: return badge.description;
    }
}

export function BadgeShowcase({ compact }: BadgeShowcaseProps) {
    const { data: badges, isLoading } = useStudentBadges();

    if (isLoading) return <SkeletonCard lines={2} />;

    if (!badges || badges.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-400">
                <Award className="h-10 w-10" />
                <p className="text-sm font-medium">Belum ada badge tersedia</p>
            </div>
        );
    }

    const earned = badges.filter(b => b.is_earned);
    const locked = badges.filter(b => !b.is_earned);

    return (
        <div className="space-y-4">
            {!compact && earned.length > 0 && (
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Diraih ({earned.length})
                </p>
            )}
            <div className={cn(
                'grid gap-3',
                compact ? 'grid-cols-4 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
            )}>
                {earned.map(b => <BadgeCard key={b.badge_id} badge={b} compact={compact} />)}
                {locked.map(b => <BadgeCard key={b.badge_id} badge={b} compact={compact} />)}
            </div>
        </div>
    );
}
