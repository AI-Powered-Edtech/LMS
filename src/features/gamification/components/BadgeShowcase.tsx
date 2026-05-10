import { Award, Lock } from "lucide-react";
import { motion } from "motion/react";

import { EmptyState, SkeletonCard } from "@/components/ui";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/utils/cn";

import { useStudentBadges } from "../queries/gamificationQueries";
import type { BadgeDefinition, BadgeRarity } from "../types";
import { RARITY_CONFIG } from "../types";

/** Terjemahan fallback untuk nama badge yang belum ditranslasi di DB */
const BADGE_NAME_ID: Record<string, string> = {
  Scholar: "Cendekiawan",
  "Course Master": "Ahli Kursus",
  Unstoppable: "Tak Terhentikan",
  "On Fire": "Membara",
  "Sharp Shooter": "Penembak Jitu",
  "Speed Learner": "Pembelajar Cepat",
  Bookworm: "Kutu Buku",
};

function translateBadgeName(name: string): string {
  return BADGE_NAME_ID[name] ?? name;
}

interface BadgeShowcaseProps {
  compact?: boolean;
}

function BadgeCard({
  badge,
  compact,
  reducedMotion,
}: {
  badge: BadgeDefinition;
  compact?: boolean;
  reducedMotion?: boolean;
}) {
  const rarity =
    RARITY_CONFIG[badge.rarity as BadgeRarity] ?? RARITY_CONFIG.common;
  const isEarned = badge.is_earned;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.3 }}
      whileHover={reducedMotion ? undefined : { scale: isEarned ? 1.07 : 1.02 }}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-center transition-shadow cursor-default select-none",
        rarity.border,
        isEarned
          ? cn(rarity.bg, "shadow-sm hover:shadow-md")
          : "bg-slate-100 dark:bg-slate-800/60 opacity-50 grayscale",
        compact && "p-2 gap-1",
      )}
    >
      {/* Rarity badge */}
      {isEarned && badge.rarity !== "common" && (
        <span
          className={cn(
            "absolute -top-2 -right-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm",
            badge.rarity === "rare" && "bg-blue-500",
            badge.rarity === "epic" && "bg-purple-500",
            badge.rarity === "legendary" &&
              "bg-gradient-to-r from-yellow-400 to-amber-500",
          )}
        >
          {rarity.label}
        </span>
      )}

      {/* Badge emoji with lock overlay for locked badges */}
      <div
        className={cn(
          "relative flex items-center justify-center rounded-full",
          compact ? "h-10 w-10 text-xl" : "h-14 w-14 text-3xl",
        )}
      >
        <span className={cn(!isEarned && "opacity-60")}>
          {badge.icon_emoji}
        </span>
        {!isEarned && (
          <div className="absolute inset-0 flex items-end justify-end">
            <div className="w-5 h-5 rounded-full bg-slate-600 dark:bg-slate-500 flex items-center justify-center shadow-sm">
              <Lock className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Name */}
      <h4
        className={cn(
          "font-bold leading-tight",
          compact ? "text-[10px]" : "text-xs",
          isEarned
            ? "text-slate-800 dark:text-slate-200"
            : "text-slate-400 dark:text-slate-500",
        )}
      >
        {translateBadgeName(badge.name)}
      </h4>

      {!compact && (
        <>
          <p className="text-[10px] leading-tight text-slate-500 dark:text-slate-400 line-clamp-2">
            {isEarned ? badge.description : criteriaHint(badge)}
          </p>

          {isEarned && badge.earned_at && (
            <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
              Diraih{" "}
              {new Date(badge.earned_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}

          {badge.xp_reward > 0 && (
            <span
              className={cn(
                "text-[9px] font-bold",
                isEarned
                  ? "text-yellow-600 dark:text-yellow-500"
                  : "text-slate-400 dark:text-slate-500",
              )}
            >
              +{badge.xp_reward} XP
            </span>
          )}
        </>
      )}
    </motion.div>
  );
}

function criteriaHint(badge: BadgeDefinition): string {
  if (!badge.criteria) return "Selesaikan tantangan";
  const c = badge.criteria as Record<string, unknown>;
  switch (c.type) {
    case "lessons_completed":
      return `Selesaikan ${c.threshold} pelajaran`;
    case "streak_days":
      return `Streak ${c.threshold} hari`;
    case "quiz_perfect_score":
      return `${c.threshold} nilai sempurna`;
    case "course_completed":
      return "Selesaikan 1 kursus";
    case "courses_completed":
      return `Selesaikan ${c.threshold} kursus`;
    case "course_master":
      return "Kursus dengan rata-rata \u2265 90%";
    case "speed_learner":
      return "Selesaikan pelajaran lebih cepat";
    default:
      return badge.description;
  }
}

export function BadgeShowcase({ compact }: BadgeShowcaseProps) {
  const { data: badges, isLoading } = useStudentBadges();
  const reducedMotion = useReducedMotion();

  if (isLoading) return <SkeletonCard lines={2} />;

  if (!badges || badges.length === 0) {
    return (
      <EmptyState
        icon={<Award className="w-8 h-8" />}
        title="Belum ada lencana tersedia"
      />
    );
  }

  const earned = badges.filter((b) => b.is_earned);
  const locked = badges.filter((b) => !b.is_earned);

  if (compact) {
    return (
      <div className="grid gap-3 grid-cols-4 sm:grid-cols-6">
        {earned.map((b) => (
          <BadgeCard
            key={b.badge_id}
            badge={b}
            compact
            reducedMotion={reducedMotion}
          />
        ))}
        {locked.map((b) => (
          <BadgeCard
            key={b.badge_id}
            badge={b}
            compact
            reducedMotion={reducedMotion}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {earned.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
            Diraih ({earned.length})
          </p>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {earned.map((b) => (
              <BadgeCard
                key={b.badge_id}
                badge={b}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
        </div>
      )}

      {locked.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
            Terkunci ({locked.length})
          </p>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
            {locked.map((b) => (
              <BadgeCard
                key={b.badge_id}
                badge={b}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
