import { Users2 } from 'lucide-react'

import { useAuth } from '@/contexts/AuthContext'
import { PeerReviewList } from '@/features/peer-review'
import { usePageTitle } from '@/hooks/usePageTitle'

export function PeerReviews() {
  usePageTitle('Peer Review')
  const { user, tenantId } = useAuth()

  if (!user || !tenantId) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Page header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <Users2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Peer Review</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Tugas penilaian sejawat yang diberikan kepada Anda
            </p>
          </div>
        </div>

        {/* Review list */}
        <PeerReviewList userId={user.id} tenantId={tenantId} />
      </div>
    </div>
  )
}
