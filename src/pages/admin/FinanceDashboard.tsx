import { FinanceDashboard as FinanceDashboardFeature } from '@/features/administration/components/FinanceDashboard'
import { usePageTitle } from '@/hooks/usePageTitle'

export function FinanceDashboard() {
  usePageTitle('Dasbor Keuangan')

  return (
    <div className="p-6">
      <FinanceDashboardFeature />
    </div>
  )
}
