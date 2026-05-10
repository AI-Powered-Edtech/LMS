import {
  AlertTriangle,
  BarChart2,
  MessageSquare,
  Star,
  Users2,
} from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/utils/cn";

import {
  usePeerReviewConfig,
  useReviewsBySubmission,
} from "../queries/peerReviewQueries";
import type { PeerReview } from "../types";

interface PeerReviewSummaryProps {
  submissionId: string;
  assignmentId: string;
  tenantId: string;
}

function ReviewItem({
  review,
  index,
  isAnonymous,
}: {
  review: PeerReview;
  index: number;
  isAnonymous: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
          {isAnonymous
            ? `Reviewer ${index + 1} (Anonim)`
            : `Reviewer: ${review.reviewer_id.slice(0, 8)}…`}
        </span>
        {review.overall_score !== null && (
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-bold text-slate-800 dark:text-white">
              {review.overall_score}/100
            </span>
          </div>
        )}
      </div>
      {review.overall_comment && (
        <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
          {review.overall_comment}
        </p>
      )}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "text-xs px-2 py-0.5 rounded-full font-bold",
            review.status === "submitted"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              : review.status === "disputed"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
          )}
        >
          {review.status === "submitted"
            ? "Dikirim"
            : review.status === "disputed"
              ? "Diperdebatkan"
              : "Belum dikirim"}
        </span>
        {review.submitted_at && (
          <span className="text-xs text-slate-400">
            {new Date(review.submitted_at).toLocaleString("id-ID")}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function PeerReviewSummary({
  submissionId,
  assignmentId,
  tenantId,
}: PeerReviewSummaryProps) {
  const { data: reviews, isLoading } = useReviewsBySubmission(
    submissionId,
    tenantId,
  );
  const { data: config } = usePeerReviewConfig(assignmentId, tenantId);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-20 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Users2 className="w-5 h-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Belum ada peer review untuk tugas ini.
        </p>
      </div>
    );
  }

  const submittedReviews = reviews.filter((r) => r.status === "submitted");
  const scores = submittedReviews
    .map((r) => r.overall_score)
    .filter((s): s is number => s !== null);
  const avgScore =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

  const isAnonymous = config?.is_anonymous ?? true;
  const hasDisputed = reviews.some((r) => r.status === "disputed");

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users2 className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-white">
            {reviews.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Review
          </p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-white">
            {avgScore ?? "—"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Rata-rata Nilai
          </p>
        </div>
        <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-lg font-bold text-slate-800 dark:text-white">
            {submittedReviews.length}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Dikirim</p>
        </div>
      </div>

      {/* Disputed warning */}
      {hasDisputed && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <p className="text-xs text-red-700 dark:text-red-300">
            Ada review yang diperdebatkan. Tinjau dan minta ulang jika perlu.
          </p>
        </div>
      )}

      {/* Individual reviews */}
      <div className="space-y-3">
        {reviews.map((review, i) => (
          <ReviewItem
            key={review.id}
            review={review}
            index={i}
            isAnonymous={isAnonymous}
          />
        ))}
      </div>
    </div>
  );
}
