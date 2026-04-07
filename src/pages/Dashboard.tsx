import { Trophy } from 'lucide-react'
import { motion } from 'motion/react'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: [0.16, 1, 0.3, 1] as any,
    },
  },
}

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

  // ⚡ Perf: memoize all derived data to prevent recalculation on every render
  const userName = useMemo(() => {
    return impersonatedStudent
      ? impersonatedStudent.name
      : role === 'teacher'
        ? profile?.first_name || 'Bapak/Ibu Guru'
        : profile?.first_name || 'Siswa'
  }, [impersonatedStudent, role, profile?.first_name])

  const activeCourses = useMemo(() => {
    return Array.isArray(courses)
      ? courses
      : ((courses as unknown as { courses?: unknown[] })?.courses ?? [])
  }, [courses])

  const announcementList: Announcement[] = useMemo(() => {
    return Array.isArray(announcements) ? announcements : []
  }, [announcements])

  const leaderboardList: LeaderboardEntry[] = useMemo(() => {
    return Array.isArray(leaderboard) ? leaderboard : []
  }, [leaderboard])

  // ⚡ Perf: memoize hub items filter — navigationItems is static, only role changes
  const hubItems = useMemo(() => {
    return navigationItems.filter(
      (item) => item.location === 'learning-hub' && item.roles.includes(role)
    )
  }, [role])

  // ⚡ Perf: stabilize callback refs to prevent child re-renders
  const openJoinModal = useCallback(() => setShowJoinModal(true), [])
  const handleNavigateBack = useCallback(() => navigate(-1), [navigate])
  const handleRetryLeaderboard = useCallback(() => refetchLeaderboard(), [refetchLeaderboard])
  const handleCloseJoinModal = useCallback(() => setShowJoinModal(false), [])
  const handleCloseBadgeModal = useCallback(() => setShowBadgeModal(false), [])

  return (
    <div
      data-testid="dashboard-main"
      className="flex flex-col flex-1 w-full h-full overflow-y-auto custom-scrollbar scroll-smooth bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-8"
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-7xl mx-auto w-full space-y-6"
      >
        <motion.div variants={itemVariants}>
          <WelcomeCard
            userName={userName}
            role={role}
            impersonatedStudent={impersonatedStudent}
            onNavigateBack={handleNavigateBack}
            xp={xp}
          />
        </motion.div>

        {role === 'student' && (
          <motion.div variants={itemVariants}>
            <MyClassesSection classrooms={classrooms} onJoinClass={openJoinModal} />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <UpcomingAssignments assignments={assignments || []} loading={assignmentsLoading} />
        </motion.div>

        {/* Koleksi Lencana (Student Only) */}
        {role === 'student' && (
          <motion.div variants={itemVariants}>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Koleksi Lencana
                </h2>
              </div>
              <BadgeShowcase compact />
            </Card>
          </motion.div>
        )}

        {role === 'student' && (
          <motion.div variants={itemVariants}>
            <ContinueLearning
              courses={activeCourses as Parameters<typeof ContinueLearning>[0]['courses']}
              loading={loadingCourses}
              onJoinClass={openJoinModal}
            />
          </motion.div>
        )}

        {role === 'student' && user?.id && (
          <motion.div variants={itemVariants}>
            <RecommendationFeed userId={user.id} />
          </motion.div>
        )}

        {/* Bottom Grid: Pengumuman & Leaderboard */}
        <motion.div
          variants={itemVariants}
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
            role={role}
            leaderboardList={leaderboardList}
            loading={loadingLeaderboard}
            error={leaderboardError}
            onRetry={handleRetryLeaderboard}
          />
        </motion.div>

        {/* Hub View */}
        <motion.div
          variants={itemVariants}
          className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700"
        >
          <HubView
            title="Ruang Belajar (Hub)"
            description="Akses cepat ke semua fitur pembelajaran Anda."
            items={hubItems}
          />
        </motion.div>

        <motion.div variants={itemVariants}>
          <GamificationWidgets xp={xp} dailyGoal={dailyGoal} achievements={achievements} />
        </motion.div>
      </motion.div>

      {/* Modals */}
      <JoinClassModal
        open={showJoinModal}
        onClose={handleCloseJoinModal}
        initialCode={joinInitialCode}
        onJoin={joinClassroom}
      />
      <BadgeRewardModal open={showBadgeModal} onClose={handleCloseBadgeModal} />
      <BadgeUnlockToast />
      <LevelUpToast />
      {role === 'student' && <StudentWelcome />}
    </div>
  )
}
