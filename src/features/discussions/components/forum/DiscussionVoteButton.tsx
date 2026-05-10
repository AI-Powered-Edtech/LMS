/**
 * DiscussionVoteButton — upvote + accepted-answer UI for discussion posts.
 * Phase 36B: Discussion Forum Gamification
 *
 * Features:
 * - Upvote toggle (optimistic count update)
 * - "Jawaban Terbaik" indicator when accepted
 * - "Tandai Terbaik" button visible to teachers only
 * - Self-vote prevention (hides button for own posts)
 */

import { Check, ThumbsUp } from "lucide-react";
import { useState } from "react";

import { useToast } from "@/hooks/useToast";
import { cn } from "@/utils/cn";

import { discussionService } from "../../api/discussionService";

interface DiscussionVoteButtonProps {
  postId: string;
  /** Current server-side upvote count */
  upvoteCount: number;
  /** Whether this post is marked as accepted answer */
  isAcceptedAnswer: boolean;
  /** True if the viewing user authored this post (prevents self-vote) */
  isOwnPost: boolean;
  /** Show the "Tandai Terbaik" button (teacher/admin only) */
  showAcceptButton?: boolean;
  /** Called after a successful vote toggle — use to refetch if needed */
  onVoted?: () => void;
  /** Called after successfully accepting an answer */
  onAccepted?: () => void;
}

export function DiscussionVoteButton({
  postId,
  upvoteCount,
  isAcceptedAnswer,
  isOwnPost,
  showAcceptButton = false,
  onVoted,
  onAccepted,
}: DiscussionVoteButtonProps) {
  const { addToast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  /** Optimistic local count — null means use server value */
  const [localDelta, setLocalDelta] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);

  const displayCount = upvoteCount + localDelta;

  async function handleVote() {
    if (isVoting || isOwnPost) return;
    setIsVoting(true);

    try {
      const result = await discussionService.togglePostVote(postId, "upvote");

      if (result.action === "added") {
        setLocalDelta((d) => d + 1);
        setHasVoted(true);
      } else if (result.action === "removed") {
        setLocalDelta((d) => Math.max(-upvoteCount, d - 1));
        setHasVoted(false);
      }

      onVoted?.();
    } catch (err) {
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal memberi vote",
      });
    } finally {
      setIsVoting(false);
    }
  }

  async function handleAccept() {
    if (isAccepting) return;
    setIsAccepting(true);

    try {
      await discussionService.acceptDiscussionAnswer(postId);
      addToast({
        type: "success",
        message: "Jawaban ditandai sebagai terbaik",
      });
      onAccepted?.();
    } catch (err) {
      addToast({
        type: "error",
        message: err instanceof Error ? err.message : "Gagal menandai jawaban",
      });
    } finally {
      setIsAccepting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Upvote button — hidden for own posts */}
      {!isOwnPost && (
        <button
          type="button"
          onClick={handleVote}
          disabled={isVoting}
          aria-label={hasVoted ? "Hapus upvote" : "Beri upvote"}
          aria-pressed={hasVoted}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasVoted
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:hover:bg-slate-600",
          )}
        >
          <ThumbsUp
            className={cn(
              "h-3.5 w-3.5",
              hasVoted && "fill-primary-600 dark:fill-primary-400",
            )}
            aria-hidden="true"
          />
          <span>{displayCount}</span>
        </button>
      )}

      {/* "Jawaban Terbaik" badge */}
      {isAcceptedAnswer && (
        <span
          className="flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          aria-label="Jawaban terbaik"
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Jawaban Terbaik
        </span>
      )}

      {/* "Tandai Terbaik" button — teacher/admin only, hidden if already accepted */}
      {showAcceptButton && !isAcceptedAnswer && (
        <button
          type="button"
          onClick={handleAccept}
          disabled={isAccepting}
          aria-label="Tandai sebagai jawaban terbaik"
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
            "text-slate-500 hover:bg-emerald-50 hover:text-emerald-600",
            "dark:text-slate-400 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {isAccepting ? "Menyimpan..." : "Tandai Terbaik"}
        </button>
      )}
    </div>
  );
}
