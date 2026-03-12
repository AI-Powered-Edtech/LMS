import { getLevelTier } from './LevelBadge';

interface LevelProgressProps {
    level: number;
    totalPoints: number;
}

const XP_PER_LEVEL = 400;

export function LevelProgress({ level, totalPoints }: LevelProgressProps) {
    const currentLevelXP = (level - 1) * XP_PER_LEVEL;
    const xpIntoCurrentLevel = totalPoints - currentLevelXP;
    const progress = Math.max(0, Math.min(1, xpIntoCurrentLevel / XP_PER_LEVEL));
    const progressPercent = Math.round(progress * 100);
    const { label, color } = getLevelTier(level);

    return (
        <div className="w-full space-y-1.5">
            <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                    Level {level} — <span className="text-slate-500">{label}</span>
                </span>
                <span className="text-slate-500 font-medium">
                    {xpIntoCurrentLevel} / {XP_PER_LEVEL} XP
                </span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${color}`}
                    style={{ width: `${progressPercent}%` }}
                />
            </div>
        </div>
    );
}
