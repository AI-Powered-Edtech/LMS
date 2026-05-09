import { lazy } from "react";
import { useTranslation } from "react-i18next";

import { FeatureErrorBoundary } from "../components/FeatureErrorBoundary";

// ============================================================
// withErrorBoundary HOC — wraps a lazy component in FeatureErrorBoundary.
// featureNameKey is an i18n key resolved inside the wrapper at render time
// so the fallback feature name follows the active language.
// ============================================================

const withErrorBoundary =
  (
    Component: React.ComponentType<Record<string, unknown>>,
    featureNameKey: string,
  ) =>
  (props: Record<string, unknown>) => {
    const { t } = useTranslation();
    return (
      <FeatureErrorBoundary featureName={t(featureNameKey)}>
        <Component {...props} />
      </FeatureErrorBoundary>
    );
  };

// ============================================================
// Auth / Public pages
// ============================================================

export const Login = withErrorBoundary(
  lazy(() => import("../pages/Login").then((m) => ({ default: m.Login }))),
  "lazyPages.login",
);
export const AuthCallback = withErrorBoundary(
  lazy(() =>
    import("../pages/AuthCallback").then((m) => ({ default: m.AuthCallback })),
  ),
  "lazyPages.authCallback",
);
export const AuthError = withErrorBoundary(
  lazy(() =>
    import("../pages/AuthError").then((m) => ({ default: m.AuthError })),
  ),
  "lazyPages.authError",
);
export const ForgotPassword = withErrorBoundary(
  lazy(() =>
    import("../pages/ForgotPassword").then((m) => ({
      default: m.ForgotPassword,
    })),
  ),
  "lazyPages.forgotPassword",
);
export const ResetPassword = withErrorBoundary(
  lazy(() =>
    import("../pages/ResetPassword").then((m) => ({
      default: m.ResetPassword,
    })),
  ),
  "lazyPages.resetPassword",
);
export const VerifyEmail = withErrorBoundary(
  lazy(() =>
    import("../pages/VerifyEmail").then((m) => ({ default: m.VerifyEmail })),
  ),
  "lazyPages.verifyEmail",
);
export const WorkspaceSelector = withErrorBoundary(
  lazy(() =>
    import("../pages/WorkspaceSelector").then((m) => ({
      default: m.WorkspaceSelector,
    })),
  ),
  "lazyPages.workspaceSelector",
);
export const Unauthorized = withErrorBoundary(
  lazy(() =>
    import("../pages/Unauthorized").then((m) => ({ default: m.Unauthorized })),
  ),
  "lazyPages.unauthorized",
);
export const NotFound = withErrorBoundary(
  lazy(() =>
    import("../pages/NotFound").then((m) => ({ default: m.NotFound })),
  ),
  "lazyPages.notFound",
);
export const NotificationsPage = withErrorBoundary(
  lazy(() =>
    import("../pages/Notifications").then((m) => ({
      default: m.Notifications,
    })),
  ),
  "lazyPages.notifications",
);
export const PrivacyPolicy = withErrorBoundary(
  lazy(() =>
    import("../pages/PrivacyPolicy").then((m) => ({
      default: m.PrivacyPolicy,
    })),
  ),
  "lazyPages.privacyPolicy",
);
export const TermsOfService = withErrorBoundary(
  lazy(() =>
    import("../pages/TermsOfService").then((m) => ({
      default: m.TermsOfService,
    })),
  ),
  "lazyPages.termsOfService",
);

// ============================================================
// Student pages
// ============================================================

export const Dashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/Dashboard").then((m) => ({ default: m.Dashboard })),
  ),
  "lazyPages.dashboard",
);
export const LessonViewer = withErrorBoundary(
  lazy(() =>
    import("../pages/LessonViewer").then((m) => ({ default: m.LessonViewer })),
  ),
  "lazyPages.lessonViewer",
);
export const QuizModule = withErrorBoundary(
  lazy(() => import("../pages/Quiz").then((m) => ({ default: m.QuizModule }))),
  "lazyPages.quizModule",
);
export const StudentClassPage = withErrorBoundary(
  lazy(() =>
    import("../pages/StudentClassPage").then((m) => ({
      default: m.StudentClassPage,
    })),
  ),
  "lazyPages.studentClassPage",
);
export const Certificates = withErrorBoundary(
  lazy(() =>
    import("../pages/Certificates").then((m) => ({ default: m.Certificates })),
  ),
  "lazyPages.certificates",
);
export const Grades = withErrorBoundary(
  lazy(() => import("../pages/Grades").then((m) => ({ default: m.Grades }))),
  "lazyPages.grades",
);
export const StudentAttendance = withErrorBoundary(
  lazy(() =>
    import("../pages/StudentAttendance").then((m) => ({
      default: m.StudentAttendance,
    })),
  ),
  "lazyPages.studentAttendance",
);
export const LtiCallback = withErrorBoundary(
  lazy(() =>
    import("../pages/LtiCallback").then((m) => ({ default: m.LtiCallback })),
  ),
  "lazyPages.ltiCallback",
);
export const InviteRedeem = withErrorBoundary(
  lazy(() =>
    import("../pages/InviteRedeem").then((m) => ({ default: m.InviteRedeem })),
  ),
  "lazyPages.inviteRedeem",
);
export const Offline = withErrorBoundary(
  lazy(() => import("../pages/Offline").then((m) => ({ default: m.Offline }))),
  "lazyPages.offline",
);
export const EnrollPage = withErrorBoundary(
  lazy(() =>
    import("../pages/EnrollPage").then((m) => ({ default: m.EnrollPage })),
  ),
  "lazyPages.enrollPage",
);

// ============================================================
// Teacher pages
// ============================================================

export const TeacherDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/TeacherDashboard").then((m) => ({
      default: m.TeacherDashboard,
    })),
  ),
  "lazyPages.teacherDashboard",
);
export const Courses = withErrorBoundary(
  lazy(() => import("../pages/Courses").then((m) => ({ default: m.Courses }))),
  "lazyPages.courses",
);
export const CourseBuilder = withErrorBoundary(
  lazy(() =>
    import("../pages/CourseBuilder").then((m) => ({
      default: m.CourseBuilder,
    })),
  ),
  "lazyPages.courseBuilder",
);
export const QuizManager = withErrorBoundary(
  lazy(() =>
    import("../pages/QuizManager").then((m) => ({ default: m.QuizManager })),
  ),
  "lazyPages.quizManager",
);
export const QuestionBankPage = withErrorBoundary(
  lazy(() =>
    import("../pages/QuestionBankPage").then((m) => ({
      default: m.QuestionBankPage,
    })),
  ),
  "lazyPages.questionBank",
);
export const QuizGradebook = withErrorBoundary(
  lazy(() =>
    import("../pages/QuizGradebook").then((m) => ({
      default: m.QuizGradebook,
    })),
  ),
  "lazyPages.quizGradebook",
);
export const AssignmentGradebook = withErrorBoundary(
  lazy(() =>
    import("../pages/AssignmentGradebook").then((m) => ({
      default: m.AssignmentGradebook,
    })),
  ),
  "lazyPages.assignmentGradebook",
);
export const Gradebook = withErrorBoundary(
  lazy(() =>
    import("../pages/Gradebook").then((m) => ({ default: m.Gradebook })),
  ),
  "lazyPages.gradebook",
);
export const SpeedGrader = withErrorBoundary(
  lazy(() =>
    import("../pages/SpeedGrader").then((m) => ({ default: m.SpeedGrader })),
  ),
  "lazyPages.speedGrader",
);
export const CourseAnalytics = withErrorBoundary(
  lazy(() =>
    import("../pages/CourseAnalytics").then((m) => ({
      default: m.CourseAnalytics,
    })),
  ),
  "lazyPages.courseAnalytics",
);
export const TeacherLessonMonitorPage = withErrorBoundary(
  lazy(() =>
    import("../features/lesson-monitor/pages/TeacherLessonMonitorPage").then(
      (m) => ({
        default: m.TeacherLessonMonitorPage,
      }),
    ),
  ),
  "lazyPages.teacherLessonMonitor",
);
export const Dashboards = withErrorBoundary(
  lazy(() =>
    import("../pages/Dashboards").then((m) => ({ default: m.Dashboards })),
  ),
  "lazyPages.dashboard",
);
export const ClassManagement = withErrorBoundary(
  lazy(() =>
    import("../pages/ClassManagement").then((m) => ({
      default: m.ClassManagement,
    })),
  ),
  "lazyPages.classManagement",
);
export const Analytics = withErrorBoundary(
  lazy(() =>
    import("../pages/Analytics").then((m) => ({ default: m.Analytics })),
  ),
  "lazyPages.analytics",
);
export const ScanAttendance = withErrorBoundary(
  lazy(() =>
    import("../pages/ScanAttendance").then((m) => ({
      default: m.ScanAttendance,
    })),
  ),
  "lazyPages.scanAttendance",
);
export const DocumentManager = withErrorBoundary(
  lazy(() =>
    import("../pages/DocumentManager").then((m) => ({
      default: m.DocumentManager,
    })),
  ),
  "lazyPages.documentManager",
);
export const Creator = withErrorBoundary(
  lazy(() => import("../pages/Creator").then((m) => ({ default: m.Creator }))),
  "lazyPages.creator",
);
export const StudentProgress = withErrorBoundary(
  lazy(() =>
    import("../pages/StudentProgress").then((m) => ({
      default: m.StudentProgress,
    })),
  ),
  "lazyPages.studentProgress",
);
export const StruggleDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/StruggleDashboard").then((m) => ({
      default: m.StruggleDashboard,
    })),
  ),
  "lazyPages.struggleDashboard",
);
export const AdaptivePathsPage = withErrorBoundary(
  lazy(() =>
    import("../pages/AdaptivePaths").then((m) => ({
      default: m.AdaptivePaths,
    })),
  ),
  "lazyPages.adaptivePaths",
);
export const PlagiarismDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/PlagiarismDashboard").then((m) => ({
      default: m.PlagiarismDashboard,
    })),
  ),
  "lazyPages.plagiarismDashboard",
);
export const LtiManagement = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/LtiManagement").then((m) => ({
      default: m.LtiManagement,
    })),
  ),
  "lazyPages.ltiManagement",
);

// ============================================================
// Shared pages (all roles)
// ============================================================

export const Forum = withErrorBoundary(
  lazy(() => import("../pages/Forum").then((m) => ({ default: m.Forum }))),
  "lazyPages.forum",
);
export const Profile = withErrorBoundary(
  lazy(() => import("../pages/Profile").then((m) => ({ default: m.Profile }))),
  "lazyPages.profile",
);
export const PublicProfile = withErrorBoundary(
  lazy(() =>
    import("../pages/PublicProfile").then((m) => ({
      default: m.PublicProfile,
    })),
  ),
  "lazyPages.publicProfile",
);
export const Settings = withErrorBoundary(
  lazy(() =>
    import("../pages/Settings").then((m) => ({ default: m.Settings })),
  ),
  "lazyPages.settings",
);
export const Calendar = withErrorBoundary(
  lazy(() =>
    import("../pages/Calendar").then((m) => ({ default: m.Calendar })),
  ),
  "lazyPages.calendar",
);
export const Announcements = withErrorBoundary(
  lazy(() =>
    import("../pages/Announcements").then((m) => ({
      default: m.Announcements,
    })),
  ),
  "lazyPages.announcements",
);
export const Assignments = withErrorBoundary(
  lazy(() =>
    import("../pages/Assignments").then((m) => ({ default: m.Assignments })),
  ),
  "lazyPages.assignments",
);
export const GroupAssignment = withErrorBoundary(
  lazy(() =>
    import("../pages/GroupAssignment").then((m) => ({
      default: m.GroupAssignment,
    })),
  ),
  "lazyPages.groupAssignment",
);
export const Directory = withErrorBoundary(
  lazy(() =>
    import("../pages/Directory").then((m) => ({ default: m.Directory })),
  ),
  "lazyPages.directory",
);
export const Leaderboard = withErrorBoundary(
  lazy(() =>
    import("../pages/Leaderboard").then((m) => ({ default: m.Leaderboard })),
  ),
  "lazyPages.leaderboard",
);

// ============================================================
// Hub pages
// ============================================================

export const TeachingHub = withErrorBoundary(
  lazy(() => import("../pages/Hubs").then((m) => ({ default: m.TeachingHub }))),
  "lazyPages.teachingHub",
);
export const SocialHub = withErrorBoundary(
  lazy(() => import("../pages/Hubs").then((m) => ({ default: m.SocialHub }))),
  "lazyPages.socialHub",
);
export const GamificationHub = withErrorBoundary(
  lazy(() =>
    import("../pages/Hubs").then((m) => ({ default: m.GamificationHub })),
  ),
  "lazyPages.gamificationHub",
);

// ============================================================
// Admin pages
// ============================================================

export const BillingDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/BillingDashboard").then((m) => ({
      default: m.BillingDashboard,
    })),
  ),
  "lazyPages.billingDashboard",
);
export const ModerationDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/ModerationDashboard").then((m) => ({
      default: m.ModerationDashboard,
    })),
  ),
  "lazyPages.moderationDashboard",
);
export const FinanceDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/FinanceDashboard").then((m) => ({
      default: m.FinanceDashboard,
    })),
  ),
  "lazyPages.financeDashboard",
);
export const PPDBDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/PPDBDashboard").then((m) => ({
      default: m.PPDBDashboard,
    })),
  ),
  "lazyPages.ppdbDashboard",
);
export const AdministrationDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/AdministrationDashboard").then((m) => ({
      default: m.AdministrationDashboard,
    })),
  ),
  "lazyPages.administrationDashboard",
);
export const UserManagement = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/UserManagement").then((m) => ({
      default: m.UserManagement,
    })),
  ),
  "lazyPages.userManagement",
);
export const AuditDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/AuditDashboard").then((m) => ({
      default: m.AuditDashboard,
    })),
  ),
  "lazyPages.auditDashboard",
);
export const ReviewQueue = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/ReviewQueue").then((m) => ({
      default: m.ReviewQueue,
    })),
  ),
  "lazyPages.reviewQueue",
);
export const AdminAnalyticsDashboard = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/AdminAnalyticsDashboard").then((m) => ({
      default: m.AdminAnalyticsDashboard,
    })),
  ),
  "lazyPages.adminAnalyticsDashboard",
);
export const SystemHealth = withErrorBoundary(
  lazy(() =>
    import("../pages/admin/SystemHealth").then((m) => ({
      default: m.SystemHealth,
    })),
  ),
  "lazyPages.systemHealth",
);
export const FeatureFlagsPage = withErrorBoundary(
  lazy(() => import("../pages/admin/FeatureFlags")),
  "lazyPages.featureFlags",
);
export const SemesterPage = withErrorBoundary(
  lazy(() => import("../pages/admin/SemesterPage")),
  "lazyPages.semester",
);
export const AcademicYears = withErrorBoundary(
  lazy(() =>
    import("../pages/AcademicYears").then((m) => ({
      default: m.AcademicYears,
    })),
  ),
  "lazyPages.academicYears",
);
export const RombelManagement = withErrorBoundary(
  lazy(() =>
    import("../pages/RombelManagement").then((m) => ({
      default: m.RombelManagement,
    })),
  ),
  "lazyPages.rombelManagement",
);
export const Subjects = withErrorBoundary(
  lazy(() =>
    import("../pages/Subjects").then((m) => ({ default: m.Subjects })),
  ),
  "lazyPages.subjects",
);
export const Timetable = withErrorBoundary(
  lazy(() =>
    import("../pages/Timetable").then((m) => ({ default: m.Timetable })),
  ),
  "lazyPages.timetable",
);
export const Rapor = withErrorBoundary(
  lazy(() => import("../pages/Rapor").then((m) => ({ default: m.Rapor }))),
  "lazyPages.rapor",
);
export const BosTracking = withErrorBoundary(
  lazy(() =>
    import("../pages/BosTracking").then((m) => ({ default: m.BosTracking })),
  ),
  "lazyPages.bosTracking",
);
export const PpdbJalur = withErrorBoundary(
  lazy(() =>
    import("../pages/PpdbJalur").then((m) => ({ default: m.PpdbJalur })),
  ),
  "lazyPages.ppdbJalur",
);
export const P5Projects = withErrorBoundary(
  lazy(() =>
    import("../pages/P5Projects").then((m) => ({ default: m.P5Projects })),
  ),
  "lazyPages.p5Projects",
);
export const Integrations = withErrorBoundary(
  lazy(() =>
    import("../pages/Integrations").then((m) => ({ default: m.Integrations })),
  ),
  "lazyPages.integrations",
);
export const PrincipalInsights = withErrorBoundary(
  lazy(() =>
    import("../pages/PrincipalInsights").then((m) => ({
      default: m.PrincipalInsights,
    })),
  ),
  "lazyPages.principalInsights",
);
export const StudentDossier = withErrorBoundary(
  lazy(() =>
    import("../pages/StudentDossier").then((m) => ({
      default: m.StudentDossier,
    })),
  ),
  "lazyPages.studentDossier",
);
export const Counseling = withErrorBoundary(
  lazy(() =>
    import("../pages/Counseling").then((m) => ({ default: m.Counseling })),
  ),
  "lazyPages.counseling",
);
export const AkmStimuli = withErrorBoundary(
  lazy(() =>
    import("../pages/AkmStimuli").then((m) => ({ default: m.AkmStimuli })),
  ),
  "lazyPages.akmStimuli",
);
export const BankVa = withErrorBoundary(
  lazy(() => import("../pages/BankVa").then((m) => ({ default: m.BankVa }))),
  "lazyPages.bankVa",
);
export const SemanticSearch = withErrorBoundary(
  lazy(() =>
    import("../pages/SemanticSearch").then((m) => ({
      default: m.SemanticSearch,
    })),
  ),
  "lazyPages.semanticSearch",
);
export const ParentLinks = withErrorBoundary(
  lazy(() =>
    import("../pages/ParentLinks").then((m) => ({ default: m.ParentLinks })),
  ),
  "lazyPages.parentLinks",
);
export const StaffDossier = withErrorBoundary(
  lazy(() =>
    import("../pages/StaffDossier").then((m) => ({ default: m.StaffDossier })),
  ),
  "lazyPages.staffDossier",
);
export const RaporPrint = withErrorBoundary(
  lazy(() =>
    import("../pages/RaporPrint").then((m) => ({ default: m.RaporPrint })),
  ),
  "lazyPages.raporPrint",
);
export const RombelAttendance = withErrorBoundary(
  lazy(() =>
    import("../pages/RombelAttendance").then((m) => ({
      default: m.RombelAttendance,
    })),
  ),
  "lazyPages.rombelAttendance",
);

// ============================================================
// Parent pages
// ============================================================
// Parent pages
// ============================================================

export const ParentRegisterPage = withErrorBoundary(
  lazy(() =>
    import("../features/auth/components/ParentRegisterPage").then((m) => ({
      default: m.ParentRegisterPage,
    })),
  ),
  "lazyPages.parentRegister",
);

// ============================================================
// MFA / 2FA pages
// ============================================================

export const MFASetupPage = withErrorBoundary(
  lazy(() =>
    import("../features/auth/components/MFASetupPage").then((m) => ({
      default: m.MFASetupPage,
    })),
  ),
  "lazyPages.mfaSetup",
);

export const MFAVerifyPage = withErrorBoundary(
  lazy(() =>
    import("../features/auth/components/MFAVerifyPage").then((m) => ({
      default: m.MFAVerifyPage,
    })),
  ),
  "lazyPages.mfaVerify",
);

// ============================================================
// Privacy / GDPR pages
// ============================================================

export const DataExportPage = withErrorBoundary(
  lazy(() =>
    import("../features/profile/components/DataExportPage").then((m) => ({
      default: m.DataExportPage,
    })),
  ),
  "lazyPages.dataExport",
);

export const AccountDeletionPage = withErrorBoundary(
  lazy(() =>
    import("../features/profile/components/AccountDeletionPage").then((m) => ({
      default: m.AccountDeletionPage,
    })),
  ),
  "lazyPages.accountDeletion",
);

// ============================================================
// Peer Review
// ============================================================

export const PeerReviews = withErrorBoundary(
  lazy(() =>
    import("../pages/PeerReviews").then((m) => ({ default: m.PeerReviews })),
  ),
  "lazyPages.peerReviews",
);

// ============================================================
// Survey Respondent
// ============================================================

export const SurveyRespondPage = withErrorBoundary(
  lazy(() =>
    import("../pages/SurveyRespond").then((m) => ({
      default: m.SurveyRespondPage,
    })),
  ),
  "lazyPages.surveyRespond",
);
