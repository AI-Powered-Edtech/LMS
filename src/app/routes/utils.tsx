import { Suspense } from 'react'

import { FeatureErrorBoundary } from '../../components/FeatureErrorBoundary'
import { AppLoading } from '../../components/layout/AppLoading'
import { LazyLoadTimeout } from '../../components/ui/LazyLoadTimeout'

/**
 * Wraps a component in Suspense + FeatureErrorBoundary.
 * ROUTE-MED-01: FeatureErrorBoundary is always applied (not optional) so that
 * lazy-load and render errors are caught on every route, not just named ones.
 * Shared across all route domain files.
 */
export function S({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const boundary = feature ?? 'Halaman'
  return (
    <FeatureErrorBoundary featureName={boundary}>
      <Suspense
        fallback={
          <LazyLoadTimeout>
            <AppLoading />
          </LazyLoadTimeout>
        }
      >
        {children}
      </Suspense>
    </FeatureErrorBoundary>
  )
}
