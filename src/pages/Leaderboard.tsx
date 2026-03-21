import { useEffect } from "react";
import { LeaderboardV2 } from "@/src/features/gamification/components/LeaderboardV2";

export function Leaderboard() {
  useEffect(() => {
    document.title = 'Papan Peringkat — EduSync';
    return () => { document.title = 'EduSync'; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto flex-1 w-full flex flex-col p-4 md:p-8">
      <LeaderboardV2 />
    </div>
  );
}
