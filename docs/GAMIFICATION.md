# EduSync LMS — Gamification System

Gamification features are in `src/features/gamification/`.

## XP (Experience Points)

XP is awarded when a student passes a quiz. The flow:

1. Student submits quiz → `v1_submit_quiz_attempt()` RPC
2. Attempt status updates to `GRADED`
3. `handle_quiz_attempt_status_change` trigger fires
4. `award_quiz_xp()` RPC is called
5. XP recorded in `xp_transactions`
6. `xp_profiles` totals updated

The `award_quiz_xp` RPC enforces that `auth.uid() = p_user_id` — a student cannot award XP to another user (security fix FIX-1, migration 836).

XP amounts are determined by quiz score relative to passing threshold.

**Tables:**
- `xp_profiles` — `(user_id, total_xp, level, streak_current, streak_longest, last_activity_date)`
- `xp_transactions` — individual XP award records with `source_type` and `source_id`

**RPC:** `record_xp_transaction(p_user_id, p_xp_amount, p_source_type, p_source_id)`

## Level Progression

Level is computed by `compute_level()` function from total XP. There are 10 levels.

`xp_profiles.level` is updated by trigger whenever `total_xp` changes.

**Frontend component:** `src/features/gamification/components/XPProgressBar.tsx`

## Badges

Badges are defined in `badge_definitions` table with rarity tiers. Awarded to students via `student_badges`.

Badge triggers:
- `handle_quiz_badges` — fires on quiz attempt completion, checks quiz-related badge criteria
- `handle_streak_badges` — fires when streak updates, checks streak-related badge criteria
- `award_badge_if_qualified()` — core badge award function

When a badge is earned, `on_badge_earned` trigger emits a realtime database event for the UI to show a popup.

**Frontend component:** `src/features/gamification/components/BadgeShowcase.tsx`

## Leaderboard

Tenant-scoped leaderboard showing top students by XP.

**RPC:** `get_leaderboard_v2(p_tenant_id, p_limit)` — returns ranked list within the caller's tenant.

**Frontend component:** `src/features/gamification/components/LeaderboardV2.tsx`

**Route:** `/#/leaderboard` (accessible to students and teachers)

## Streaks

Daily activity streak tracked in `xp_profiles.streak_current`.

- Streak increments when a student has activity on consecutive days
- `handle_streak_on_activity` trigger updates streak when learning events occur
- `streak_longest` tracks all-time best streak

**pg_cron job:** `badge-xp-streak-processor` runs every 5 minutes to process batch XP and streak updates.

## Struggle Score

`struggle_score` is a composite score on a 0–11 scale that feeds into engagement segmentation. High scores indicate students who need attention.

Inputs include:
- Quiz failure rate
- Low engagement signals
- Inactivity duration

**Source:** `src/features/struggle/` — see `docs/ANALYTICS.md` for the engagement segment breakdown.

## Migrations

| Migration | Content |
|-----------|---------|
| `821_achievements.sql` | Badge definitions, student_badges, award logic |
| `822_streaks_xp.sql` | XP transactions, xp_profiles, streak tracking, leaderboard v2 |
| `836_security_fixes.sql` | `award_quiz_xp` caller identity check |
