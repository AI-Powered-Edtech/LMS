// EduSync LMS — UI Design System
// Import: import { Button, Card, Modal } from '@/components/ui';
//
// 📦 Canonical UI primitives. Use these instead of custom implementations.
// Deprecated components are marked with @deprecated - migrate to canonical versions.

// ============ FORM COMPONENTS ============
export { Button } from './Button'
export * from './FormField'
export { Input } from './Input'
export { Select } from './Select'

// ============ FEEDBACK COMPONENTS ============
export { EmptyState } from './EmptyState'
export { ErrorBanner } from './ErrorBanner'
export { ErrorFallback } from './ErrorFallback'
// @deprecated Use ErrorFallback instead
export { ErrorBoundary as UIErrorBoundary } from './ErrorBoundary'
export { Skeleton, SkeletonCard } from './Skeleton'
export { Spinner } from './Spinner'
export type { Toast } from './Toast'
export { ToastContainer, useToast } from './Toast'
export { Tooltip } from './Tooltip'

// ============ NAVIGATION COMPONENTS ============
export { Breadcrumb } from './Breadcrumb'
export { BulkActionBar } from './BulkActionBar'
export type { BulkAction, BulkActionBarProps } from './BulkActionBar'
export type { Tab } from './Tabs'
export { Tabs } from './Tabs'

// ============ OVERLAY COMPONENTS ============
export { Modal, ModalBody, ModalFooter, ModalHeader } from './Modal'

// ============ CONTENT COMPONENTS ============
export { Avatar } from './Avatar'
export { Badge } from './Badge'
export { Card } from './Card'
export { MathRenderer } from './MathRenderer'
export { OfflineBanner } from './OfflineBanner'
export { OptimizedImage } from './OptimizedImage'
