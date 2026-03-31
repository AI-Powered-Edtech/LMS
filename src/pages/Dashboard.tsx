import { Trophy } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { HubView } from '@/components/HubView'
import { Card } from '@/components/ui'
import { useAuth } from '@/contexts/AuthContext'
import type { Announcement } from '@/features/announcements'
import { useAnnouncements } from '@/features/announcements'
import { useAssignments } from '@/features/assignments/hooks/useAssignments'
import { useClassroom } from '@/features/classroom/hooks/useClassroomQueries'
import { useCourses } from '@/features/courses'
import {
  AnnouncementsPreview,
  ContinueLearning,
  GamificationWidgets,
  LeaderboardPreview,
  MyClassesSection,
  UpcomingAssignments,
  WelcomeCard,
} from '@/features/dashboards/components/sections'
import type { LeaderboardEntry } from '@/features/gamification'
import { useLeaderboard } from '@/features/gamification'
import { BadgeShowcase } from '@/features/gamification/components/BadgeShowcase'
import { BadgeUnlockToast } from '@/features/gamification/components/BadgeUnlockToast'
import { LevelUpToast } from '@/features/gamification/components/LevelUpToast'
import { StudentWelcome } from '@/features/onboarding'
import { useStudentProgressData } from '@/features/progress/hooks/useStudentProgressQueries'
import { RecommendationFeed } from '@/features/recommendations'
import { usePageTitle } from '@/hooks/usePageTitle'
import { navigationItems } from '@/shared/config/navigation'
import { cn } from '@/utils/cn'

import { BadgeRewardModal } from './dashboard/BadgeRewardModal'
import { JoinClassModal } from './dashboard/JoinClassModal'

export function Dashboard() {
  usePageTitle('Dasbor')
  const { role, user, profile } = useAuth()

  const { xp, dailyGoal, achievements } = useStudentProgressData()
  const { assignments, loading: assignmentsLoading } = useAssignments()
  const { classrooms, activeClassroomId, joinClassroom } = useClassroom()

  const { data: courses, isLoading: loadingCourses } = useCourses({ limit: 4 })
  const { data: announcements, isLoading: loadingAnnouncements } = useAnnouncements({
    limit: 2,
    status: 'published',
  })
  const {
    data: leaderboard,
    isLoading: loadingLeaderboard,
    isError: leaderboardError,
    refetch: refetchLeaderboard,
  } = useLeaderboard(activeClassroomId)

  const [showBadgeModal, setShowBadgeModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinInitialCode, setJoinInitialCode] = useState('')

  const navigate = useNavigate()
  const location = useLocation()
  const impersonatedStudent = location.state?.impersonateStudent

  // Handle deep link join: /?join=XH2K7
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const joinCode = searchParams.get('join')
    if (joinCode && role === 'student') {
      setJoinInitialCode(joinCode.toUpperCase())
      setShowJoinModal(true)
      window.history.replaceState({}, document.title, location.pathname)
    }
  }, [location, role])

  // ⚡ Perf: Memoize derived data — previously recomputed on every render
  const userName = useMemo(
    () =>
      impersonatedStudent
        ? impersonatedStudent.name
        : role === 'teacher'
          ? profile?.first_name || 'Bapak/Ibu Guru'
          : profile?.first_name || 'Siswa',
    [impersonatedStudent, role, profile?.first_name]
  )
  const activeCourses = useMemo(
    () =>
      Array.isArray(courses)
        ? courses
        : ((courses as unknown as { courses?: unknown[] })?.courses ?? []),
    [courses]
  )
  const announcementList: Announcement[] = useMemo(
    () => (Array.isArray(announcements) ? announcements : []),
    [announcements]
  )
  const leaderboardList: LeaderboardEntry[] = useMemo(
    () => (Array.isArray(leaderboard) ? leaderboard : []),
    [leaderboard]
  )
  const hubItems = useMemo(
    () =>
      navigationItems.filter(
        (item) => item.location === 'learning-hub' && item.roles.includes(role)
      ),
    [role]
  )
  // ⚡ Perf: Stable callback reference — inline arrow was creating new fn on every render
  const openJoinModal = useCallback(() => setShowJoinModal(true), [])

  return (
    <div
      data-testid="dashboard-main"
      className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-8"
    >
      <div className="max-w-7xl mx-auto w-full space-y-6">
        <WelcomeCard
          userName={userName}
          role={role}
          impersonatedStudent={impersonatedStudent}
          onNavigateBack={() => navigate(-1)}
          xp={xp}
        />

        {role === 'student' && (
          <MyClassesSection classrooms={classrooms} onJoinClass={openJoinModal} />
        )}

        <UpcomingAssignments assignments={assignments || []} loading={assignmentsLoading} />

        {/* Pencapaian Terbaru (Student Only) */}
        {role === 'student' && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Pencapaian Terbaru
              </h2>
            </div>
            <BadgeShowcase compact />
          </Card>
        )}

        {role === 'student' && (
          <ContinueLearning
            courses={activeCourses as Parameters<typeof ContinueLearning>[0]['courses']}
            loading={loadingCourses}
            onJoinClass={openJoinModal}
          />
        )}

        {role === 'student' && user?.id && <RecommendationFeed userId={user.id} />}

        {/* Bottom Grid: Pengumuman & Leaderboard */}
        <div
          className={cn(
            'grid gap-6',
            !loadingAnnouncements && announcementList.length === 0
              ? 'grid-cols-1'
              : 'grid-cols-1 lg:grid-cols-2'
          )}
        >
          <AnnouncementsPreview announcements={announcementList} loading={loadingAnnouncements} />
          <LeaderboardPreview
            xp={xp}
            leaderboardList={leaderboardList}
            loading={loadingLeaderboard}
            error={leaderboardError}
            onRetry={() => refetchLeaderboard()}
          />
        </div>

        {/* Hub View */}
        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700">
          <HubView
            title="Ruang Belajar (Hub)"
            description="Akses cepat ke semua fitur pembelajaran Anda."
            items={hubItems}
          />
        </div>

        <GamificationWidgets xp={xp} dailyGoal={dailyGoal} achievements={achievements} />
      </div>

      {/* Modals */}
      <JoinClassModal
        open={showJoinModal}
        onClose={() => setShowJoinModal(false)}
        initialCode={joinInitialCode}
        onJoin={joinClassroom}
      />
      <BadgeRewardModal open={showBadgeModal} onClose={() => setShowBadgeModal(false)} />
      <BadgeUnlockToast />
      <LevelUpToast />
      {role === 'student' && <StudentWelcome />}
    </div>
  )
}
