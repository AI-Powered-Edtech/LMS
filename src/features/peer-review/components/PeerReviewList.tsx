import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  Users2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { cn } from "@/utils/cn";

import { useMyPeerReviews } from "../queries/peerReviewQueries";
import type { PeerReview } from "../types";
import { PeerReviewForm } from "./PeerReviewForm";

interface PeerReviewListProps {
  userId: string;
  tenantId: string;
}

const STATUS_LABEL: Record<string, string> = {
  assigned: "Ditugaskan",
  in_progress: "Sedang Dikerjakan",
  submitted: "Sudah Dikirim",
  disputed: "Diperdebatkan",
};

const STATUS_COLOR: Record<string, string> = {
  assigned:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  in_progress:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  submitted:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  disputed: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

function ReviewCard({
  review,
  index,
  onSelect,
}: {
  review: PeerReview;
  index: number;
  onSelect: (review: PeerReview) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors cursor-pointer"
      onClick={() => onSelect(review)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              Tugas Peer Review
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ID Tugas:{" "}
              <span className="font-mono">
                {review.submission_id.slice(0, 8)}…
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold",
              STATUS_COLOR[review.status] ?? STATUS_COLOR.assigned,
            )}
          >
            {review.status === "submitted" ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <Clock className="w-3 h-3" />
            )}
            {STATUS_LABEL[review.status] ?? review.status}
          </span>
          {review.status !== "submitted" && (
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
          )}
        </div>
      </div>

      {review.status === "submitted" && review.overall_score !== null && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Nilai yang diberikan:
          </span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {review.overall_score}/100
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function PeerReviewList({ userId, tenantId }: PeerReviewListProps) {
  const { data: reviews, isLoading } = useMyPeerReviews(userId, tenantId);
  const [activeReview, setActiveReview] = useState<PeerReview | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-20 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!reviews || reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Users2 className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-bold text-slate-600 dark:text-slate-400">
          Tidak ada tugas peer review saat ini
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Tugas peer review akan muncul di sini ketika guru mengaktifkannya.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {activeReview ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PeerReviewForm
              review={activeReview}
              tenantId={tenantId}
              userId={userId}
              onBack={() => setActiveReview(null)}
            />
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {reviews.map((review, i) => (
              <ReviewCard
                key={review.id}
                review={review}
                index={i}
                onSelect={setActiveReview}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
