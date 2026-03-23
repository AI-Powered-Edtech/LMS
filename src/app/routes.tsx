import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useParams } from 'react-router-dom'

import { FeatureErrorBoundary } from '../components/FeatureErrorBoundary'
import { AuthGuard } from '../components/guards/AuthGuard'
import { CourseEnrollmentGuard } from '../components/guards/CourseEnrollmentGuard'
import { RoleGuard } from '../components/guards/RoleGuard'
import { RoleResolver } from '../components/guards/RoleResolver'
import { TenantGuard } from '../components/guards/TenantGuard'
import { AppLoading } from '../components/layout/AppLoading'
import { Layout } from '../components/layout/Layout'

const withErrorBoundary =
  (Component: React.ComponentType<Record<string, unknown>>, name: string) =>
  (props: Record<string, unknown>) => (
    <FeatureErrorBoundary featureName={name}>
      <Component {...props} />
    </FeatureErrorBoundary>
  )

const Dashboard = withErrorBoundary(
  lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard }))),
  'Dasbor'
)
const Creator = withErrorBoundary(
  lazy(() => import('../pages/Creator').then((m) => ({ default: m.Creator }))),
  'Kreator'
)
const CourseBuilder = withErrorBoundary(
  lazy(() => import('../pages/CourseBuilder').then((m) => ({ default: m.CourseBuilder }))),
  'Pembuat Kursus'
)
const Leaderboard = withErrorBoundary(
  lazy(() => import('../pages/Leaderboard').then((m) => ({ default: m.Leaderboard }))),
  'Papan Peringkat'
)
const Forum = withErrorBoundary(
  lazy(() => import('../pages/Forum').then((m) => ({ default: m.Forum }))),
  'Forum'
)
const Analytics = withErrorBoundary(
  lazy(() => import('../pages/Analytics').then((m) => ({ default: m.Analytics }))),
  'Analitik'
)
const DocumentManager = withErrorBoundary(
  lazy(() => import('../pages/DocumentManager').then((m) => ({ default: m.DocumentManager }))),
  'Manajemen Dokumen'
)
const Courses = withErrorBoundary(
  lazy(() => import('../pages/Courses').then((m) => ({ default: m.Courses }))),
  'Kursus'
)
const Directory = withErrorBoundary(
  lazy(() => import('../pages/Directory').then((m) => ({ default: m.Directory }))),
  'Direktori'
)
const LessonViewer = withErrorBoundary(
  lazy(() => import('../pages/LessonViewer').then((m) => ({ default: m.LessonViewer }))),
  'Penampil Pelajaran'
)
const SpeedGrader = withErrorBoundary(
  lazy(() => import('../pages/SpeedGrader').then((m) => ({ default: m.SpeedGrader }))),
  'Penilaian Cepat'
)
const QuizModule = withErrorBoundary(
  lazy(() => import('../pages/Quiz').then((m) => ({ default: m.QuizModule }))),
  'Modul Kuis'
)
const BillingDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/BillingDashboard').then((m) => ({ default: m.BillingDashboard }))
  ),
  'Dasbor Tagihan'
)
const TeacherDashboard = withErrorBoundary(
  lazy(() => import('../pages/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))),
  'Dasbor Guru'
)
const ScanAttendance = withErrorBoundary(
  lazy(() => import('../pages/ScanAttendance').then((m) => ({ default: m.ScanAttendance }))),
  'Pindai Kehadiran'
)
const Profile = withErrorBoundary(
  lazy(() => import('../pages/Profile').then((m) => ({ default: m.Profile }))),
  'Profil'
)
const PublicProfile = withErrorBoundary(
  lazy(() => import('../pages/PublicProfile').then((m) => ({ default: m.PublicProfile }))),
  'Profil Publik'
)
const Settings = withErrorBoundary(
  lazy(() => import('../pages/Settings').then((m) => ({ default: m.Settings }))),
  'Pengaturan'
)
const Gradebook = withErrorBoundary(
  lazy(() => import('../pages/Gradebook').then((m) => ({ default: m.Gradebook }))),
  'Buku Nilai'
)
const QuizGradebook = withErrorBoundary(
  lazy(() => import('../pages/QuizGradebook').then((m) => ({ default: m.QuizGradebook }))),
  'Buku Nilai Kuis'
)
const AssignmentGradebook = withErrorBoundary(
  lazy(() =>
    import('../pages/AssignmentGradebook').then((m) => ({ default: m.AssignmentGradebook }))
  ),
  'Buku Nilai Tugas'
)
const Certificates = withErrorBoundary(
  lazy(() => import('../pages/Certificates').then((m) => ({ default: m.Certificates }))),
  'Sertifikat'
)
const Calendar = withErrorBoundary(
  lazy(() => import('../pages/Calendar').then((m) => ({ default: m.Calendar }))),
  'Kalender'
)
const Announcements = withErrorBoundary(
  lazy(() => import('../pages/Announcements').then((m) => ({ default: m.Announcements }))),
  'Pengumuman'
)
const Assignments = withErrorBoundary(
  lazy(() => import('../pages/Assignments').then((m) => ({ default: m.Assignments }))),
  'Tugas'
)
const StudentProgress = withErrorBoundary(
  lazy(() => import('../pages/StudentProgress').then((m) => ({ default: m.StudentProgress }))),
  'Progres Siswa'
)
const GroupAssignment = withErrorBoundary(
  lazy(() => import('../pages/GroupAssignment').then((m) => ({ default: m.GroupAssignment }))),
  'Tugas Kelompok'
)
const Grades = withErrorBoundary(
  lazy(() => import('../pages/Grades').then((m) => ({ default: m.Grades }))),
  'Nilai'
)
const StudentAttendance = withErrorBoundary(
  lazy(() => import('../pages/StudentAttendance').then((m) => ({ default: m.StudentAttendance }))),
  'Kehadiran Siswa'
)
const QuestionBankPage = withErrorBoundary(
  lazy(() => import('../pages/QuestionBankPage').then((m) => ({ default: m.QuestionBankPage }))),
  'Bank Soal'
)
const QuizManager = withErrorBoundary(
  lazy(() => import('../pages/QuizManager').then((m) => ({ default: m.QuizManager }))),
  'Manajemen Kuis'
)
const CourseAnalytics = withErrorBoundary(
  lazy(() => import('../pages/CourseAnalytics').then((m) => ({ default: m.CourseAnalytics }))),
  'Analitik Kursus'
)
const Dashboards = withErrorBoundary(
  lazy(() => import('../pages/Dashboards').then((m) => ({ default: m.Dashboards }))),
  'Dasbor'
)
const ClassManagement = withErrorBoundary(
  lazy(() => import('../pages/ClassManagement').then((m) => ({ default: m.ClassManagement }))),
  'Manajemen Kelas'
)
const StudentClassPage = withErrorBoundary(
  lazy(() => import('../pages/StudentClassPage').then((m) => ({ default: m.StudentClassPage }))),
  'Halaman Kelas Siswa'
)
const ModerationDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/ModerationDashboard').then((m) => ({ default: m.ModerationDashboard }))
  ),
  'Dasbor Moderasi'
)
const FinanceDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/FinanceDashboard').then((m) => ({ default: m.FinanceDashboard }))
  ),
  'Dasbor Keuangan'
)
const PPDBDashboard = withErrorBoundary(
  lazy(() => import('../pages/admin/PPDBDashboard').then((m) => ({ default: m.PPDBDashboard }))),
  'Dasbor PPDB'
)
const AdministrationDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/AdministrationDashboard').then((m) => ({
      default: m.AdministrationDashboard,
    }))
  ),
  'Dasbor Administrasi'
)
const UserManagement = withErrorBoundary(
  lazy(() => import('../pages/admin/UserManagement').then((m) => ({ default: m.UserManagement }))),
  'Manajemen Pengguna'
)
const AuditDashboard = withErrorBoundary(
  lazy(() => import('../pages/admin/AuditDashboard').then((m) => ({ default: m.AuditDashboard }))),
  'Dasbor Audit'
)
const AdminAnalyticsDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/AdminAnalyticsDashboard').then((m) => ({
      default: m.AdminAnalyticsDashboard,
    }))
  ),
  'Dasbor Analitik Admin'
)
const SystemHealth = withErrorBoundary(
  lazy(() => import('../pages/admin/SystemHealth').then((m) => ({ default: m.SystemHealth }))),
  'Kesehatan Sistem'
)
const FeatureFlagsPage = withErrorBoundary(
  lazy(() => import('../pages/admin/FeatureFlags')),
  'Pengaturan Fitur'
)

const Login = withErrorBoundary(
  lazy(() => import('../pages/Login').then((m) => ({ default: m.Login }))),
  'Masuk'
)
const ForgotPassword = withErrorBoundary(
  lazy(() => import('../pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword }))),
  'Lupa Kata Sandi'
)
const ResetPassword = withErrorBoundary(
  lazy(() => import('../pages/ResetPassword').then((m) => ({ default: m.ResetPassword }))),
  'Atur Ulang Kata Sandi'
)
const VerifyEmail = withErrorBoundary(
  lazy(() => import('../pages/VerifyEmail').then((m) => ({ default: m.VerifyEmail }))),
  'Verifikasi Email'
)

const TeachingHub = withErrorBoundary(
  lazy(() => import('../pages/Hubs').then((m) => ({ default: m.TeachingHub }))),
  'Pusat Mengajar'
)
const SocialHub = withErrorBoundary(
  lazy(() => import('../pages/Hubs').then((m) => ({ default: m.SocialHub }))),
  'Pusat Sosial'
)
const GamificationHub = withErrorBoundary(
  lazy(() => import('../pages/Hubs').then((m) => ({ default: m.GamificationHub }))),
  'Pusat Gamifikasi'
)
const WorkspaceSelector = withErrorBoundary(
  lazy(() => import('../pages/WorkspaceSelector').then((m) => ({ default: m.WorkspaceSelector }))),
  'Pemilihan Ruang Kerja'
)
const Unauthorized = withErrorBoundary(
  lazy(() => import('../pages/Unauthorized').then((m) => ({ default: m.Unauthorized }))),
  'Tidak Diizinkan'
)
const NotFound = withErrorBoundary(
  lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound }))),
  'Tidak Ditemukan'
)
const NotificationsPage = withErrorBoundary(
  lazy(() => import('../pages/Notifications').then((m) => ({ default: m.Notifications }))),
  'Notifikasi'
)

/* Parameterized redirect helpers — Navigate cannot interpolate :params */
function RedirectCourseDetail() {
  const { courseId } = useParams()
  return <Navigate to={`/app/student/courses/${courseId}`} replace />
}
function RedirectStudentClass() {
  const { classId } = useParams()
  return <Navigate to={`/app/student/classes/${classId}`} replace />
}
function RedirectStudentProgress() {
  const { studentId } = useParams()
  return <Navigate to={`/app/teacher/student-progress/${studentId}`} replace />
}

export function AppRoutes() {
  return (
    <Routes>
      {/* === Public Routes === */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<AppLoading />}>
            <Login />
          </Suspense>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <Suspense fallback={<AppLoading />}>
            <ForgotPassword />
          </Suspense>
        }
      />
      <Route
        path="/reset-password"
        element={
          <Suspense fallback={<AppLoading />}>
            <ResetPassword />
          </Suspense>
        }
      />
      <Route
        path="/verify-email"
        element={
          <AuthGuard requireEmailVerification={false}>
            <Suspense fallback={<AppLoading />}>
              <VerifyEmail />
            </Suspense>
          </AuthGuard>
        }
      />

      <Route
        path="/workspace-selector"
        element={
          <AuthGuard>
            <Suspense fallback={<AppLoading />}>
              <WorkspaceSelector />
            </Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/unauthorized"
        element={
          <Suspense fallback={<AppLoading />}>
            <Unauthorized />
          </Suspense>
        }
      />
      <Route
        path="/404"
        element={
          <Suspense fallback={<AppLoading />}>
            <NotFound />
          </Suspense>
        }
      />

      {/* === Auth-Protected Layout === */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <TenantGuard>
              <Layout />
            </TenantGuard>
          </AuthGuard>
        }
      >
        <Route path="app">
          <Route index element={<RoleResolver />} />

          {/* === /app/student Routes === */}
          <Route
            path="student"
            element={
              <RoleGuard allowedRoles={['student']}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Dashboard">
                    <Dashboard />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Dashboard">
                    <Dashboard />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="courses"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Lesson Viewer">
                    <LessonViewer />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="courses/:courseId"
              element={
                <CourseEnrollmentGuard>
                  <Suspense fallback={<AppLoading />}>
                    <FeatureErrorBoundary featureName="Lesson Viewer">
                      <LessonViewer />
                    </FeatureErrorBoundary>
                  </Suspense>
                </CourseEnrollmentGuard>
              }
            />
            <Route
              path="quizzes"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Quiz">
                    <QuizModule />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="assignments"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Assignments />
                </Suspense>
              }
            />
            <Route
              path="classes/:classId"
              element={
                <Suspense fallback={<AppLoading />}>
                  <StudentClassPage />
                </Suspense>
              }
            />
            <Route
              path="certificates"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Certificates />
                </Suspense>
              }
            />
            <Route
              path="grades"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Grades />
                </Suspense>
              }
            />
            <Route
              path="attendance"
              element={
                <Suspense fallback={<AppLoading />}>
                  <StudentAttendance />
                </Suspense>
              }
            />
            <Route
              path="gamification"
              element={
                <Suspense fallback={<AppLoading />}>
                  <GamificationHub />
                </Suspense>
              }
            />
            <Route
              path="leaderboard"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Leaderboard">
                    <Leaderboard />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<AppLoading />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>

          {/* === /app/teacher Routes === */}
          <Route
            path="teacher"
            element={
              <RoleGuard allowedRoles={['teacher']}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<AppLoading />}>
                  <TeacherDashboard />
                </Suspense>
              }
            />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<AppLoading />}>
                  <TeacherDashboard />
                </Suspense>
              }
            />
            <Route
              path="teaching-hub"
              element={
                <Suspense fallback={<AppLoading />}>
                  <TeachingHub />
                </Suspense>
              }
            />
            <Route
              path="courses"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Courses />
                </Suspense>
              }
            />
            <Route
              path="course-builder"
              element={
                <Suspense fallback={<AppLoading />}>
                  <CourseBuilder />
                </Suspense>
              }
            />
            <Route
              path="quiz-manager"
              element={
                <Suspense fallback={<AppLoading />}>
                  <QuizManager />
                </Suspense>
              }
            />
            <Route
              path="question-bank"
              element={
                <Suspense fallback={<AppLoading />}>
                  <QuestionBankPage />
                </Suspense>
              }
            />
            <Route
              path="quiz-gradebook"
              element={
                <Suspense fallback={<AppLoading />}>
                  <QuizGradebook />
                </Suspense>
              }
            />
            <Route
              path="assignment-gradebook"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AssignmentGradebook />
                </Suspense>
              }
            />
            <Route
              path="gradebook"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Gradebook />
                </Suspense>
              }
            />
            <Route
              path="grader"
              element={
                <Suspense fallback={<AppLoading />}>
                  <SpeedGrader />
                </Suspense>
              }
            />
            <Route
              path="course-analytics"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Course Analytics">
                    <CourseAnalytics />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="dashboards"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Dashboards />
                </Suspense>
              }
            />
            <Route
              path="classes"
              element={
                <Suspense fallback={<AppLoading />}>
                  <ClassManagement />
                </Suspense>
              }
            />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Analytics">
                    <Analytics />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="scan-attendance"
              element={
                <Suspense fallback={<AppLoading />}>
                  <ScanAttendance />
                </Suspense>
              }
            />
            <Route
              path="documents"
              element={
                <Suspense fallback={<AppLoading />}>
                  <DocumentManager />
                </Suspense>
              }
            />
            <Route
              path="creator"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Creator />
                </Suspense>
              }
            />
            <Route
              path="student-progress/:studentId"
              element={
                <Suspense fallback={<AppLoading />}>
                  <StudentProgress />
                </Suspense>
              }
            />
            <Route
              path="leaderboard"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureErrorBoundary featureName="Leaderboard">
                    <Leaderboard />
                  </FeatureErrorBoundary>
                </Suspense>
              }
            />
            <Route
              path="moderation"
              element={
                <Suspense fallback={<AppLoading />}>
                  <ModerationDashboard />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<AppLoading />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>

          {/* === /app/admin Routes === */}
          <Route
            path="admin"
            element={
              <RoleGuard allowedRoles={['admin']}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<AppLoading />}>
                  <AdministrationDashboard />
                </Suspense>
              }
            />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AdministrationDashboard />
                </Suspense>
              }
            />
            <Route
              path="users"
              element={
                <Suspense fallback={<AppLoading />}>
                  <UserManagement />
                </Suspense>
              }
            />
            <Route
              path="billing"
              element={
                <Suspense fallback={<AppLoading />}>
                  <BillingDashboard />
                </Suspense>
              }
            />
            <Route
              path="moderation"
              element={
                <Suspense fallback={<AppLoading />}>
                  <ModerationDashboard />
                </Suspense>
              }
            />
            <Route
              path="finance"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FinanceDashboard />
                </Suspense>
              }
            />
            <Route
              path="ppdb"
              element={
                <Suspense fallback={<AppLoading />}>
                  <PPDBDashboard />
                </Suspense>
              }
            />
            <Route
              path="administration"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AdministrationDashboard />
                </Suspense>
              }
            />
            <Route
              path="audit"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AuditDashboard />
                </Suspense>
              }
            />
            <Route
              path="analytics"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AdminAnalyticsDashboard />
                </Suspense>
              }
            />
            <Route
              path="documents"
              element={
                <Suspense fallback={<AppLoading />}>
                  <DocumentManager />
                </Suspense>
              }
            />
            <Route
              path="creator"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Creator />
                </Suspense>
              }
            />
            <Route
              path="courses"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Courses />
                </Suspense>
              }
            />
            <Route
              path="course-builder"
              element={
                <Suspense fallback={<AppLoading />}>
                  <CourseBuilder />
                </Suspense>
              }
            />
            <Route
              path="quiz-manager"
              element={
                <Suspense fallback={<AppLoading />}>
                  <QuizManager />
                </Suspense>
              }
            />
            <Route
              path="question-bank"
              element={
                <Suspense fallback={<AppLoading />}>
                  <QuestionBankPage />
                </Suspense>
              }
            />
            <Route
              path="gradebook"
              element={
                <Suspense fallback={<AppLoading />}>
                  <Gradebook />
                </Suspense>
              }
            />
            <Route
              path="quiz-gradebook"
              element={
                <Suspense fallback={<AppLoading />}>
                  <QuizGradebook />
                </Suspense>
              }
            />
            <Route
              path="assignment-gradebook"
              element={
                <Suspense fallback={<AppLoading />}>
                  <AssignmentGradebook />
                </Suspense>
              }
            />
            <Route
              path="grader"
              element={
                <Suspense fallback={<AppLoading />}>
                  <SpeedGrader />
                </Suspense>
              }
            />
            <Route
              path="classes"
              element={
                <Suspense fallback={<AppLoading />}>
                  <ClassManagement />
                </Suspense>
              }
            />
            <Route
              path="scan-attendance"
              element={
                <Suspense fallback={<AppLoading />}>
                  <ScanAttendance />
                </Suspense>
              }
            />
            <Route
              path="student-progress/:studentId"
              element={
                <Suspense fallback={<AppLoading />}>
                  <StudentProgress />
                </Suspense>
              }
            />
            <Route
              path="system-health"
              element={
                <Suspense fallback={<AppLoading />}>
                  <SystemHealth />
                </Suspense>
              }
            />
            <Route
              path="feature-flags"
              element={
                <Suspense fallback={<AppLoading />}>
                  <FeatureFlagsPage />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense fallback={<AppLoading />}>
                  <NotFound />
                </Suspense>
              }
            />
          </Route>
        </Route>

        {/* === Shared Routes (all authenticated roles) === */}
        <Route
          path="forum"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Forum />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="profile"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Profile />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="p/:username"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <PublicProfile />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="settings"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Settings />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="calendar"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Calendar />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="announcements"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Announcements />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="assignments"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Assignments />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="group-assignment"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <GroupAssignment />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="directory"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <Directory />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="social-hub"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <SocialHub />
              </Suspense>
            </RoleGuard>
          }
        />
        <Route
          path="notifications"
          element={
            <RoleGuard allowedRoles={['teacher', 'student', 'admin']}>
              <Suspense fallback={<AppLoading />}>
                <NotificationsPage />
              </Suspense>
            </RoleGuard>
          }
        />

        {/* === Legacy Redirects (backward compatibility) === */}
        <Route index element={<Navigate to="/app" replace />} />
        <Route path="dashboard" element={<Navigate to="/app/student/dashboard" replace />} />
        <Route path="lesson" element={<Navigate to="/app/student/courses" replace />} />
        <Route path="quiz" element={<Navigate to="/app/student/quizzes" replace />} />
        <Route path="courses" element={<Navigate to="/app/student/courses" replace />} />
        <Route path="courses/:courseId" element={<RedirectCourseDetail />} />
        <Route path="classes/:classId" element={<RedirectStudentClass />} />
        <Route path="certificates" element={<Navigate to="/app/student/certificates" replace />} />
        <Route path="grades" element={<Navigate to="/app/student/grades" replace />} />
        <Route path="attendance" element={<Navigate to="/app/student/attendance" replace />} />
        <Route
          path="gamification-hub"
          element={<Navigate to="/app/student/gamification" replace />}
        />
        <Route path="leaderboard" element={<Navigate to="/app/student/leaderboard" replace />} />
        <Route
          path="teacher-dashboard"
          element={<Navigate to="/app/teacher/dashboard" replace />}
        />
        <Route path="teaching" element={<Navigate to="/app/teacher/teaching-hub" replace />} />
        <Route path="teaching/courses" element={<Navigate to="/app/teacher/courses" replace />} />
        <Route
          path="teaching/course-builder"
          element={<Navigate to="/app/teacher/course-builder" replace />}
        />
        <Route
          path="teaching/quiz-manager"
          element={<Navigate to="/app/teacher/quiz-manager" replace />}
        />
        <Route
          path="teaching/question-bank"
          element={<Navigate to="/app/teacher/question-bank" replace />}
        />
        <Route
          path="teaching/quiz-gradebook"
          element={<Navigate to="/app/teacher/quiz-gradebook" replace />}
        />
        <Route
          path="teaching/assignment-gradebook"
          element={<Navigate to="/app/teacher/assignment-gradebook" replace />}
        />
        <Route
          path="teaching/course-analytics"
          element={<Navigate to="/app/teacher/course-analytics" replace />}
        />
        <Route
          path="teaching/dashboards"
          element={<Navigate to="/app/teacher/dashboards" replace />}
        />
        <Route path="teaching/classes" element={<Navigate to="/app/teacher/classes" replace />} />
        <Route path="grader" element={<Navigate to="/app/teacher/grader" replace />} />
        <Route path="gradebook" element={<Navigate to="/app/teacher/gradebook" replace />} />
        <Route path="analytics" element={<Navigate to="/app/teacher/analytics" replace />} />
        <Route
          path="scan-attendance"
          element={<Navigate to="/app/teacher/scan-attendance" replace />}
        />
        <Route path="documents" element={<Navigate to="/app/teacher/documents" replace />} />
        <Route path="creator" element={<Navigate to="/app/teacher/creator" replace />} />
        <Route path="student-progress/:studentId" element={<RedirectStudentProgress />} />
        <Route path="admin-hub" element={<Navigate to="/app/admin/dashboard" replace />} />
        <Route path="admin/moderation" element={<Navigate to="/app/admin/moderation" replace />} />
        <Route path="admin/finance" element={<Navigate to="/app/admin/finance" replace />} />
        <Route path="admin/ppdb" element={<Navigate to="/app/admin/ppdb" replace />} />
        <Route
          path="admin/administration"
          element={<Navigate to="/app/admin/administration" replace />}
        />
        <Route path="admin/users" element={<Navigate to="/app/admin/users" replace />} />
        <Route path="admin/audit" element={<Navigate to="/app/admin/audit" replace />} />
        <Route path="admin/analytics" element={<Navigate to="/app/admin/analytics" replace />} />
        <Route path="billing" element={<Navigate to="/app/admin/billing" replace />} />
        <Route path="schedule" element={<Navigate to="/calendar" replace />} />

        {/* === 404 === */}
        <Route
          path="*"
          element={
            <Suspense fallback={<AppLoading />}>
              <NotFound />
            </Suspense>
          }
        />
      </Route>

      {/* 404 catch-all for unauthenticated top-level paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
