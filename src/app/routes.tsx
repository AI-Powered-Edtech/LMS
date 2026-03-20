import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

import { Layout } from "../components/layout/Layout";
import { AppLoading } from "../components/layout/AppLoading";
import { FeatureErrorBoundary } from "../components/FeatureErrorBoundary";

import { AuthGuard } from "../components/guards/AuthGuard";
import { TenantGuard } from "../components/guards/TenantGuard";
import { RoleGuard } from "../components/guards/RoleGuard";
import { RoleResolver } from "../components/guards/RoleResolver";
import { CourseEnrollmentGuard } from "../components/guards/CourseEnrollmentGuard";
import { RoleRoute } from "../components/RoleRoute";

const Dashboard = lazy(() => import("../pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Creator = lazy(() => import("../pages/Creator").then(m => ({ default: m.Creator })));
const CourseBuilder = lazy(() => import("../pages/CourseBuilder").then(m => ({ default: m.CourseBuilder })));
const Leaderboard = lazy(() => import("../pages/Leaderboard").then(m => ({ default: m.Leaderboard })));
const Forum = lazy(() => import("../pages/Forum").then(m => ({ default: m.Forum })));
const Analytics = lazy(() => import("../pages/Analytics").then(m => ({ default: m.Analytics })));
const DocumentManager = lazy(() => import("../pages/DocumentManager").then(m => ({ default: m.DocumentManager })));
const Courses = lazy(() => import("../pages/Courses").then(m => ({ default: m.Courses })));
const Directory = lazy(() => import("../pages/Directory").then(m => ({ default: m.Directory })));
const LessonViewer = lazy(() => import("../pages/LessonViewer").then(m => ({ default: m.LessonViewer })));
const SpeedGrader = lazy(() => import("../pages/SpeedGrader").then(m => ({ default: m.SpeedGrader })));
const QuizModule = lazy(() => import("../pages/Quiz").then(m => ({ default: m.QuizModule })));
const BillingDashboard = lazy(() => import("../pages/admin/BillingDashboard").then(m => ({ default: m.BillingDashboard })));
const TeacherDashboard = lazy(() => import("../pages/TeacherDashboard").then(m => ({ default: m.TeacherDashboard })));
const ScanAttendance = lazy(() => import("../pages/ScanAttendance").then(m => ({ default: m.ScanAttendance })));
const Profile = lazy(() => import("../pages/Profile").then(m => ({ default: m.Profile })));
const PublicProfile = lazy(() => import("../pages/PublicProfile").then(m => ({ default: m.PublicProfile })));
const Settings = lazy(() => import("../pages/Settings").then(m => ({ default: m.Settings })));
const Gradebook = lazy(() => import("../pages/Gradebook").then(m => ({ default: m.Gradebook })));
const QuizGradebook = lazy(() => import("../pages/QuizGradebook").then(m => ({ default: m.QuizGradebook })));
const AssignmentGradebook = lazy(() => import("../pages/AssignmentGradebook").then(m => ({ default: m.AssignmentGradebook })));
const Certificates = lazy(() => import("../pages/Certificates").then(m => ({ default: m.Certificates })));
const Calendar = lazy(() => import("../pages/Calendar").then(m => ({ default: m.Calendar })));
const Announcements = lazy(() => import("../pages/Announcements").then(m => ({ default: m.Announcements })));
const Assignments = lazy(() => import("../pages/Assignments").then(m => ({ default: m.Assignments })));
const StudentProgress = lazy(() => import("../pages/StudentProgress").then(m => ({ default: m.StudentProgress })));
const GroupAssignment = lazy(() => import("../pages/GroupAssignment").then(m => ({ default: m.GroupAssignment })));
const Grades = lazy(() => import("../pages/Grades").then(m => ({ default: m.Grades })));
const StudentAttendance = lazy(() => import("../pages/StudentAttendance").then(m => ({ default: m.StudentAttendance })));
const QuestionBankPage = lazy(() => import("../pages/QuestionBankPage").then(m => ({ default: m.QuestionBankPage })));
const QuizManager = lazy(() => import("../pages/QuizManager").then(m => ({ default: m.QuizManager })));
const CourseAnalytics = lazy(() => import("../pages/CourseAnalytics").then(m => ({ default: m.CourseAnalytics })));
const Dashboards = lazy(() => import("../pages/Dashboards").then(m => ({ default: m.Dashboards })));
const ClassManagement = lazy(() => import("../pages/ClassManagement").then(m => ({ default: m.ClassManagement })));
const StudentClassPage = lazy(() => import("../pages/StudentClassPage").then(m => ({ default: m.StudentClassPage })));
const ModerationDashboard = lazy(() => import("../pages/admin/ModerationDashboard").then(m => ({ default: m.ModerationDashboard })));
const FinanceDashboard = lazy(() => import("../pages/admin/FinanceDashboard").then(m => ({ default: m.FinanceDashboard })));
const PPDBDashboard = lazy(() => import("../pages/admin/PPDBDashboard").then(m => ({ default: m.PPDBDashboard })));
const AdministrationDashboard = lazy(() => import("../pages/admin/AdministrationDashboard").then(m => ({ default: m.AdministrationDashboard })));
const UserManagement = lazy(() => import("../pages/admin/UserManagement").then(m => ({ default: m.UserManagement })));
const AuditDashboard = lazy(() => import("../pages/admin/AuditDashboard").then(m => ({ default: m.AuditDashboard })));
const AdminAnalyticsDashboard = lazy(() => import("../pages/admin/AdminAnalyticsDashboard").then(m => ({ default: m.AdminAnalyticsDashboard })));
const Login = lazy(() => import("../pages/Login").then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import("../pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("../pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const VerifyEmail = lazy(() => import("../pages/VerifyEmail").then(m => ({ default: m.VerifyEmail })));

const TeachingHub = lazy(() => import("../pages/Hubs").then(m => ({ default: m.TeachingHub })));
const SocialHub = lazy(() => import("../pages/Hubs").then(m => ({ default: m.SocialHub })));
const GamificationHub = lazy(() => import("../pages/Hubs").then(m => ({ default: m.GamificationHub })));
const AdminHub = lazy(() => import("../pages/Hubs").then(m => ({ default: m.AdminHub })));
const WorkspaceSelector = lazy(() => import("../pages/WorkspaceSelector").then(m => ({ default: m.WorkspaceSelector })));
const Unauthorized = lazy(() => import("../pages/Unauthorized").then(m => ({ default: m.Unauthorized })));

import TestAriaPage from '@/src/pages/TestAriaPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/test-aria" element={<TestAriaPage />} />
      <Route path="/login" element={<Suspense fallback={<AppLoading />}><Login /></Suspense>} />
      <Route
        path="/forgot-password"
        element={<Suspense fallback={<AppLoading />}><ForgotPassword /></Suspense>}
      />
      <Route
        path="/reset-password"
        element={<Suspense fallback={<AppLoading />}><ResetPassword /></Suspense>}
      />
      <Route
        path="/verify-email"
        element={
          <AuthGuard requireEmailVerification={false}>
            <Suspense fallback={<AppLoading />}><VerifyEmail /></Suspense>
          </AuthGuard>
        }
      />

      <Route
        path="/workspace-selector"
        element={
          <AuthGuard>
            <Suspense fallback={<AppLoading />}><WorkspaceSelector /></Suspense>
          </AuthGuard>
        }
      />
      <Route
        path="/unauthorized"
        element={<Suspense fallback={<AppLoading />}><Unauthorized /></Suspense>}
      />
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
        {/* App prefix for role-based features */}
        <Route path="app">
          <Route index element={<RoleResolver />} />

          <Route
            path="student"
            element={
              <RoleGuard allowedRoles={["student"]}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route index element={<Suspense fallback={<AppLoading />}><Dashboard /></Suspense>} />
            <Route path="dashboard" element={<Suspense fallback={<AppLoading />}><Dashboard /></Suspense>} />
            <Route path="courses" element={<Suspense fallback={<AppLoading />}><FeatureErrorBoundary featureName="Lesson Viewer"><LessonViewer /></FeatureErrorBoundary></Suspense>} />
            <Route
              path="courses/:courseId"
              element={
                <CourseEnrollmentGuard>
                  <Suspense fallback={<AppLoading />}><FeatureErrorBoundary featureName="Lesson Viewer"><LessonViewer /></FeatureErrorBoundary></Suspense>
                </CourseEnrollmentGuard>
              }
            />
            <Route path="quizzes" element={<Suspense fallback={<AppLoading />}><FeatureErrorBoundary featureName="Quiz"><QuizModule /></FeatureErrorBoundary></Suspense>} />
            <Route path="assignments" element={<Suspense fallback={<AppLoading />}><Assignments /></Suspense>} />
          </Route>

          <Route
            path="teacher"
            element={
              <RoleGuard allowedRoles={["teacher"]}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route index element={<Suspense fallback={<AppLoading />}><TeacherDashboard /></Suspense>} />
            <Route path="dashboard" element={<Suspense fallback={<AppLoading />}><TeacherDashboard /></Suspense>} />
            <Route path="quiz-manager" element={<Suspense fallback={<AppLoading />}><QuizManager /></Suspense>} />
            <Route path="courses" element={<Suspense fallback={<AppLoading />}><Courses /></Suspense>} />
          </Route>

          <Route
            path="admin"
            element={
              <RoleGuard allowedRoles={["admin"]}>
                <Outlet />
              </RoleGuard>
            }
          >
            <Route index element={<Suspense fallback={<AppLoading />}><AdministrationDashboard /></Suspense>} />
            <Route path="dashboard" element={<Suspense fallback={<AppLoading />}><AdministrationDashboard /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<AppLoading />}><UserManagement /></Suspense>} />
          </Route>
        </Route>

        {/* Legacy / unclassified routes mapping for compatibility */}
        <Route index element={<Navigate to="/app" replace />} />

        <Route
          path="dashboard"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><Dashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="directory"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Directory /></Suspense>
            </RoleRoute>
          }
        />

        {/* Hub Routes */}
        <Route
          path="teacher-dashboard"
          element={
            <RoleRoute role="teacher">
              <Suspense fallback={<AppLoading />}><TeacherDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="social-hub"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><SocialHub /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="gamification-hub"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><GamificationHub /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin-hub"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><AdminHub /></Suspense>
            </RoleRoute>
          }
        />

        <Route
          path="lesson"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><FeatureErrorBoundary featureName="Lesson Viewer"><LessonViewer /></FeatureErrorBoundary></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="grader"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><SpeedGrader /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="quiz"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><FeatureErrorBoundary featureName="Quiz"><QuizModule /></FeatureErrorBoundary></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="billing"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><BillingDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="creator"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><Creator /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="leaderboard"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><Leaderboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="forum"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Forum /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="profile"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Profile /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="p/:username"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><PublicProfile /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="settings"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Settings /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="analytics"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><Analytics /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="scan-attendance"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><ScanAttendance /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="documents"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><DocumentManager /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="gradebook"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><Gradebook /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/quiz-gradebook"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><QuizGradebook /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/assignment-gradebook"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><AssignmentGradebook /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching"
          element={
            <RoleRoute role="teacher">
              <Suspense fallback={<AppLoading />}><TeachingHub /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/courses"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><Courses /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/question-bank"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><QuestionBankPage /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/course-builder"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><CourseBuilder /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/quiz-manager"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><QuizManager /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/course-analytics"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><CourseAnalytics /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/dashboards"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><Dashboards /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="teaching/classes"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><ClassManagement /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="certificates"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><Certificates /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="calendar"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Calendar /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="schedule"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Calendar /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="announcements"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Announcements /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="assignments"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><Assignments /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="student-progress/:studentId"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><StudentProgress /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="group-assignment"
          element={
            <RoleRoute role={["teacher", "student", "admin"]}>
              <Suspense fallback={<AppLoading />}><GroupAssignment /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="grades"
          element={
            <RoleRoute role={["student"]}>
              <Suspense fallback={<AppLoading />}><Grades /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="attendance"
          element={
            <RoleRoute role={["student"]}>
              <Suspense fallback={<AppLoading />}><StudentAttendance /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/moderation"
          element={
            <RoleRoute role={["teacher", "admin"]}>
              <Suspense fallback={<AppLoading />}><ModerationDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/finance"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><FinanceDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/ppdb"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><PPDBDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/administration"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><AdministrationDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><UserManagement /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/audit"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><AuditDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="admin/analytics"
          element={
            <RoleRoute role="admin">
              <Suspense fallback={<AppLoading />}><AdminAnalyticsDashboard /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="courses"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><LessonViewer /></Suspense>
            </RoleRoute>
          }
        />
        <Route
          path="courses/:courseId"
          element={
            <RoleRoute role={["student", "teacher", "admin"]}>
              <CourseEnrollmentGuard>
                <Suspense fallback={<AppLoading />}><LessonViewer /></Suspense>
              </CourseEnrollmentGuard>
            </RoleRoute>
          }
        />
        <Route
          path="classes/:classId"
          element={
            <RoleRoute role="student">
              <Suspense fallback={<AppLoading />}><StudentClassPage /></Suspense>
            </RoleRoute>
          }
        />

        {/* 404 catch-all for unknown paths within authenticated layout */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>

      {/* 404 catch-all for unknown top-level paths */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
