import { LeaderboardV2 } from '@/features/gamification/components/LeaderboardV2'
import { usePageTitle } from '@/hooks/usePageTitle'

export function Leaderboard() {
  usePageTitle('Papan Peringkat')

  return (
    <div className="max-w-4xl mx-auto flex-1 w-full flex flex-col p-4 md:p-8">
      <LeaderboardV2 />
    </div>
  )
}
