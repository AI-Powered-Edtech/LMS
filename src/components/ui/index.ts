// EduSync LMS — UI Design System
// Import: import { Button, Card, Modal } from '@/components/ui';
//
// 📦 Canonical UI primitives. Use these instead of custom implementations.
// Deprecated components are marked with @deprecated - migrate to canonical versions.

// ============ FORM COMPONENTS ============
export { Button } from "./Button";
export * from "./FormField";
export { Input } from "./Input";
export { Select } from "./Select";

// ============ FEEDBACK COMPONENTS ============
export { EmptyState } from "./EmptyState";
export { ErrorBoundary, withErrorBoundary } from "./ErrorBoundary";
export { ErrorFallback } from "./ErrorFallback";
export {
  CardSkeleton,
  ChartSkeleton,
  ListSkeleton,
  Skeleton,
  SkeletonBlock,
  SkeletonCard,
  TableSkeleton,
  VideoPlayerSkeleton,
} from "./Skeleton";
export { Spinner } from "./Spinner";
export type { Toast } from "./Toast";
export { ToastContainer, useToast } from "./Toast";
export { Tooltip } from "./Tooltip";

// ============ NAVIGATION COMPONENTS ============
export { Breadcrumb } from "./Breadcrumb";
export type { Tab } from "./Tabs";
export { Tabs } from "./Tabs";

// ============ OVERLAY COMPONENTS ============
export type { ConfirmDialogProps } from "./ConfirmDialog";
export { ConfirmDialog } from "./ConfirmDialog";
export { Modal, ModalBody, ModalFooter, ModalHeader } from "./Modal";

// ============ CONTENT COMPONENTS ============
export { Badge } from "./Badge";
export { Card } from "./Card";
export { OfflineBanner } from "./OfflineBanner";
export { OptimizedImage } from "./OptimizedImage";
