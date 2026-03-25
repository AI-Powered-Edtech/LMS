import { Suspense } from 'react'

import { FeatureErrorBoundary } from '../../components/FeatureErrorBoundary'
import { AppLoading } from '../../components/layout/AppLoading'
import { LazyLoadTimeout } from '../../components/ui/LazyLoadTimeout'

/**
 * Wraps a component in Suspense + optional FeatureErrorBoundary.
 * Shared across all route domain files.
 */
export function S({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const inner = feature ? (
    <FeatureErrorBoundary featureName={feature}>{children}</FeatureErrorBoundary>
  ) : (
    children
  )
  return (
    <Suspense
      fallback={
        <LazyLoadTimeout>
          <AppLoading />
        </LazyLoadTimeout>
      }
    >
      {inner}
    </Suspense>
  )
}
