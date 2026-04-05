import { lazy } from 'react'

import { FeatureErrorBoundary } from '../components/FeatureErrorBoundary'

// ============================================================
// withErrorBoundary HOC — wraps a lazy component in FeatureErrorBoundary
// ============================================================

const withErrorBoundary =
  (Component: React.ComponentType<Record<string, unknown>>, name: string) =>
  (props: Record<string, unknown>) => (
    <FeatureErrorBoundary featureName={name}>
      <Component {...props} />
    </FeatureErrorBoundary>
  )

// ============================================================
// Auth / Public pages
// ============================================================

export const Login = withErrorBoundary(
  lazy(() => import('../pages/Login').then((m) => ({ default: m.Login }))),
  'Masuk'
)
export const ForgotPassword = withErrorBoundary(
  lazy(() => import('../pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword }))),
  'Lupa Kata Sandi'
)
export const ResetPassword = withErrorBoundary(
  lazy(() => import('../pages/ResetPassword').then((m) => ({ default: m.ResetPassword }))),
  'Atur Ulang Kata Sandi'
)
export const VerifyEmail = withErrorBoundary(
  lazy(() => import('../pages/VerifyEmail').then((m) => ({ default: m.VerifyEmail }))),
  'Verifikasi Email'
)
export const WorkspaceSelector = withErrorBoundary(
  lazy(() => import('../pages/WorkspaceSelector').then((m) => ({ default: m.WorkspaceSelector }))),
  'Pemilihan Ruang Kerja'
)
export const Unauthorized = withErrorBoundary(
  lazy(() => import('../pages/Unauthorized').then((m) => ({ default: m.Unauthorized }))),
  'Tidak Diizinkan'
)
export const NotFound = withErrorBoundary(
  lazy(() => import('../pages/NotFound').then((m) => ({ default: m.NotFound }))),
  'Tidak Ditemukan'
)
export const NotificationsPage = withErrorBoundary(
  lazy(() => import('../pages/Notifications').then((m) => ({ default: m.Notifications }))),
  'Notifikasi'
)

// ============================================================
// Student pages
// ============================================================

export const Dashboard = withErrorBoundary(
  lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard }))),
  'Dasbor'
)
export const LessonViewer = withErrorBoundary(
  lazy(() => import('../pages/LessonViewer').then((m) => ({ default: m.LessonViewer }))),
  'Penampil Pelajaran'
)
export const QuizModule = withErrorBoundary(
  lazy(() => import('../pages/Quiz').then((m) => ({ default: m.QuizModule }))),
  'Modul Kuis'
)
export const StudentClassPage = withErrorBoundary(
  lazy(() => import('../pages/StudentClassPage').then((m) => ({ default: m.StudentClassPage }))),
  'Halaman Kelas Siswa'
)
export const Certificates = withErrorBoundary(
  lazy(() => import('../pages/Certificates').then((m) => ({ default: m.Certificates }))),
  'Sertifikat'
)
export const Grades = withErrorBoundary(
  lazy(() => import('../pages/Grades').then((m) => ({ default: m.Grades }))),
  'Nilai'
)
export const StudentAttendance = withErrorBoundary(
  lazy(() => import('../pages/StudentAttendance').then((m) => ({ default: m.StudentAttendance }))),
  'Kehadiran Siswa'
)
export const LtiCallback = withErrorBoundary(
  lazy(() => import('../pages/LtiCallback').then((m) => ({ default: m.LtiCallback }))),
  'LTI Callback'
)
export const InviteRedeem = withErrorBoundary(
  lazy(() => import('../pages/InviteRedeem').then((m) => ({ default: m.InviteRedeem }))),
  'Validasi Undangan'
)
export const Offline = withErrorBoundary(
  lazy(() => import('../pages/Offline').then((m) => ({ default: m.Offline }))),
  'Offline'
)
export const EnrollPage = withErrorBoundary(
  lazy(() => import('../pages/EnrollPage').then((m) => ({ default: m.EnrollPage }))),
  'Bergabung ke Kelas'
)

// ============================================================
// Teacher pages
// ============================================================

export const TeacherDashboard = withErrorBoundary(
  lazy(() => import('../pages/TeacherDashboard').then((m) => ({ default: m.TeacherDashboard }))),
  'Dasbor Guru'
)
export const Courses = withErrorBoundary(
  lazy(() => import('../pages/Courses').then((m) => ({ default: m.Courses }))),
  'Kursus'
)
export const CourseBuilder = withErrorBoundary(
  lazy(() => import('../pages/CourseBuilder').then((m) => ({ default: m.CourseBuilder }))),
  'Pembuat Kursus'
)
export const QuizManager = withErrorBoundary(
  lazy(() => import('../pages/QuizManager').then((m) => ({ default: m.QuizManager }))),
  'Manajemen Kuis'
)
export const QuestionBankPage = withErrorBoundary(
  lazy(() => import('../pages/QuestionBankPage').then((m) => ({ default: m.QuestionBankPage }))),
  'Bank Soal'
)
export const QuizGradebook = withErrorBoundary(
  lazy(() => import('../pages/QuizGradebook').then((m) => ({ default: m.QuizGradebook }))),
  'Buku Nilai Kuis'
)
export const AssignmentGradebook = withErrorBoundary(
  lazy(() =>
    import('../pages/AssignmentGradebook').then((m) => ({ default: m.AssignmentGradebook }))
  ),
  'Buku Nilai Tugas'
)
export const Gradebook = withErrorBoundary(
  lazy(() => import('../pages/Gradebook').then((m) => ({ default: m.Gradebook }))),
  'Buku Nilai'
)
export const SpeedGrader = withErrorBoundary(
  lazy(() => import('../pages/SpeedGrader').then((m) => ({ default: m.SpeedGrader }))),
  'Penilaian Cepat'
)
export const CourseAnalytics = withErrorBoundary(
  lazy(() => import('../pages/CourseAnalytics').then((m) => ({ default: m.CourseAnalytics }))),
  'Analitik Kursus'
)
export const Dashboards = withErrorBoundary(
  lazy(() => import('../pages/Dashboards').then((m) => ({ default: m.Dashboards }))),
  'Dasbor'
)
export const ClassManagement = withErrorBoundary(
  lazy(() => import('../pages/ClassManagement').then((m) => ({ default: m.ClassManagement }))),
  'Manajemen Kelas'
)
export const Analytics = withErrorBoundary(
  lazy(() => import('../pages/Analytics').then((m) => ({ default: m.Analytics }))),
  'Analitik'
)
export const ScanAttendance = withErrorBoundary(
  lazy(() => import('../pages/ScanAttendance').then((m) => ({ default: m.ScanAttendance }))),
  'Pindai Kehadiran'
)
export const DocumentManager = withErrorBoundary(
  lazy(() => import('../pages/DocumentManager').then((m) => ({ default: m.DocumentManager }))),
  'Manajemen Dokumen'
)
export const Creator = withErrorBoundary(
  lazy(() => import('../pages/Creator').then((m) => ({ default: m.Creator }))),
  'Kreator'
)
export const StudentProgress = withErrorBoundary(
  lazy(() => import('../pages/StudentProgress').then((m) => ({ default: m.StudentProgress }))),
  'Progres Siswa'
)
export const StruggleDashboard = withErrorBoundary(
  lazy(() => import('../pages/StruggleDashboard').then((m) => ({ default: m.StruggleDashboard }))),
  'Deteksi Kesulitan Belajar'
)
export const AdaptivePathsPage = withErrorBoundary(
  lazy(() => import('../pages/AdaptivePaths').then((m) => ({ default: m.AdaptivePaths }))),
  'Jalur Adaptif'
)
export const PlagiarismDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/PlagiarismDashboard').then((m) => ({ default: m.PlagiarismDashboard }))
  ),
  'Laporan Plagiarisme'
)
export const LtiManagement = withErrorBoundary(
  lazy(() => import('../pages/admin/LtiManagement').then((m) => ({ default: m.LtiManagement }))),
  'Pengaturan LTI'
)

// ============================================================
// Shared pages (all roles)
// ============================================================

export const Forum = withErrorBoundary(
  lazy(() => import('../pages/Forum').then((m) => ({ default: m.Forum }))),
  'Forum'
)
export const Profile = withErrorBoundary(
  lazy(() => import('../pages/Profile').then((m) => ({ default: m.Profile }))),
  'Profil'
)
export const PublicProfile = withErrorBoundary(
  lazy(() => import('../pages/PublicProfile').then((m) => ({ default: m.PublicProfile }))),
  'Profil Publik'
)
export const Settings = withErrorBoundary(
  lazy(() => import('../pages/Settings').then((m) => ({ default: m.Settings }))),
  'Pengaturan'
)
export const Calendar = withErrorBoundary(
  lazy(() => import('../pages/Calendar').then((m) => ({ default: m.Calendar }))),
  'Kalender'
)
export const Announcements = withErrorBoundary(
  lazy(() => import('../pages/Announcements').then((m) => ({ default: m.Announcements }))),
  'Pengumuman'
)
export const Assignments = withErrorBoundary(
  lazy(() => import('../pages/Assignments').then((m) => ({ default: m.Assignments }))),
  'Tugas'
)
export const GroupAssignment = withErrorBoundary(
  lazy(() => import('../pages/GroupAssignment').then((m) => ({ default: m.GroupAssignment }))),
  'Tugas Kelompok'
)
export const Directory = withErrorBoundary(
  lazy(() => import('../pages/Directory').then((m) => ({ default: m.Directory }))),
  'Direktori'
)
export const Leaderboard = withErrorBoundary(
  lazy(() => import('../pages/Leaderboard').then((m) => ({ default: m.Leaderboard }))),
  'Papan Peringkat'
)

// ============================================================
// Hub pages
// ============================================================

export const TeachingHub = withErrorBoundary(
  lazy(() => import('../pages/Hubs').then((m) => ({ default: m.TeachingHub }))),
  'Pusat Mengajar'
)
export const SocialHub = withErrorBoundary(
  lazy(() => import('../pages/Hubs').then((m) => ({ default: m.SocialHub }))),
  'Pusat Sosial'
)
export const GamificationHub = withErrorBoundary(
  lazy(() => import('../pages/Hubs').then((m) => ({ default: m.GamificationHub }))),
  'Pusat Gamifikasi'
)

// ============================================================
// Admin pages
// ============================================================

export const BillingDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/BillingDashboard').then((m) => ({ default: m.BillingDashboard }))
  ),
  'Dasbor Tagihan'
)
export const ModerationDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/ModerationDashboard').then((m) => ({ default: m.ModerationDashboard }))
  ),
  'Dasbor Moderasi'
)
export const FinanceDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/FinanceDashboard').then((m) => ({ default: m.FinanceDashboard }))
  ),
  'Dasbor Keuangan'
)
export const PPDBDashboard = withErrorBoundary(
  lazy(() => import('../pages/admin/PPDBDashboard').then((m) => ({ default: m.PPDBDashboard }))),
  'Dasbor PPDB'
)
export const AdministrationDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/AdministrationDashboard').then((m) => ({
      default: m.AdministrationDashboard,
    }))
  ),
  'Dasbor Administrasi'
)
export const UserManagement = withErrorBoundary(
  lazy(() => import('../pages/admin/UserManagement').then((m) => ({ default: m.UserManagement }))),
  'Manajemen Pengguna'
)
export const AuditDashboard = withErrorBoundary(
  lazy(() => import('../pages/admin/AuditDashboard').then((m) => ({ default: m.AuditDashboard }))),
  'Dasbor Audit'
)
export const AdminAnalyticsDashboard = withErrorBoundary(
  lazy(() =>
    import('../pages/admin/AdminAnalyticsDashboard').then((m) => ({
      default: m.AdminAnalyticsDashboard,
    }))
  ),
  'Dasbor Analitik Admin'
)
export const SystemHealth = withErrorBoundary(
  lazy(() => import('../pages/admin/SystemHealth').then((m) => ({ default: m.SystemHealth }))),
  'Kesehatan Sistem'
)
export const FeatureFlagsPage = withErrorBoundary(
  lazy(() => import('../pages/admin/FeatureFlags')),
  'Pengaturan Fitur'
)
export const SemesterPage = withErrorBoundary(
  lazy(() => import('../pages/admin/SemesterPage')),
  'Manajemen Semester'
)

// ============================================================
// Parent pages
// ============================================================
// Parent pages
// ============================================================

export const ParentRegisterPage = withErrorBoundary(
  lazy(() =>
    import('../features/auth/components/ParentRegisterPage').then((m) => ({
      default: m.ParentRegisterPage,
    }))
  ),
  'Daftar Orang Tua'
)

// ============================================================
// MFA / 2FA pages
// ============================================================

export const MFASetupPage = withErrorBoundary(
  lazy(() =>
    import('../features/auth/components/MFASetupPage').then((m) => ({ default: m.MFASetupPage }))
  ),
  'Setup 2FA'
)

export const MFAVerifyPage = withErrorBoundary(
  lazy(() =>
    import('../features/auth/components/MFAVerifyPage').then((m) => ({ default: m.MFAVerifyPage }))
  ),
  'Verifikasi 2FA'
)

// ============================================================
// Privacy / GDPR pages
// ============================================================

export const DataExportPage = withErrorBoundary(
  lazy(() =>
    import('../features/profile/components/DataExportPage').then((m) => ({
      default: m.DataExportPage,
    }))
  ),
  'Export Data'
)

export const AccountDeletionPage = withErrorBoundary(
  lazy(() =>
    import('../features/profile/components/AccountDeletionPage').then((m) => ({
      default: m.AccountDeletionPage,
    }))
  ),
  'Hapus Akun'
)

// ============================================================
// Peer Review
// ============================================================

export const PeerReviews = withErrorBoundary(
  lazy(() => import('../pages/PeerReviews').then((m) => ({ default: m.PeerReviews }))),
  'Peer Review'
)

// ============================================================
// Survey Respondent
// ============================================================

export const SurveyRespondPage = withErrorBoundary(
  lazy(() => import('../pages/SurveyRespond').then((m) => ({ default: m.SurveyRespondPage }))),
  'Isi Survei'
)
