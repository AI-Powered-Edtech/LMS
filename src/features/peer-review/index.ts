// ─── Service ──────────────────────────────────────────────────────────────────
export { peerReviewService } from './api/peerReviewService'

// ─── Query keys ───────────────────────────────────────────────────────────────
export { peerReviewKeys, peerReviewQueryKeys } from './queries/peerReviewKeys'

// ─── Queries & mutations ──────────────────────────────────────────────────────
export {
  useAssignReviews,
  useMyPeerReviews,
  usePeerReviewConfig,
  useReviewsBySubmission,
  useSavePeerReviewConfig,
  useSubmitPeerReview,
} from './queries/peerReviewQueries'

// ─── Components ───────────────────────────────────────────────────────────────
export { PeerReviewConfigPanel } from './components/PeerReviewConfigPanel'
export { PeerReviewForm } from './components/PeerReviewForm'
export { PeerReviewList } from './components/PeerReviewList'
export { PeerReviewSummary } from './components/PeerReviewSummary'

// ─── Types ────────────────────────────────────────────────────────────────────
export type {
  PeerReview,
  PeerReviewConfig,
  PeerReviewConfigInsert,
  PeerReviewWithDetails,
} from './types'
