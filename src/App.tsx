/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Creator } from "./pages/Creator";
import { CourseBuilder } from "./pages/CourseBuilder";
import { Leaderboard } from "./pages/Leaderboard";
import { Forum } from "./pages/Forum";
import { Analytics } from "./pages/Analytics";
import { DocumentManager } from "./pages/DocumentManager";
import { Courses } from "./pages/Courses";
import { Directory } from "./pages/Directory";
import { LessonViewer } from "./pages/LessonViewer";
import { SpeedGrader } from "./pages/SpeedGrader";
import { QuizModule } from "./pages/Quiz";
import { BillingDashboard } from "./pages/admin/BillingDashboard";
import { TeacherDashboard } from "./pages/TeacherDashboard";
import { ScanAttendance } from "./pages/ScanAttendance";
import { Profile } from "./pages/Profile";
import { PublicProfile } from "./pages/PublicProfile";
import { Settings } from "./pages/Settings";
import { Gradebook } from "./pages/Gradebook";
import { QuizGradebook } from "./pages/QuizGradebook";
import { AssignmentGradebook } from "./pages/AssignmentGradebook";
import { Certificates } from "./pages/Certificates";
import { Calendar } from "./pages/Calendar";
import { Announcements } from "./pages/Announcements";
import { Assignments } from "./pages/Assignments";
import { StudentProgress } from "./pages/StudentProgress";
import { GroupAssignment } from "./pages/GroupAssignment";
import { QuestionBankPage } from "./pages/QuestionBankPage";
import { QuizManager } from "./pages/QuizManager";
import { ClassManagement } from "./pages/ClassManagement";
import { StudentClassPage } from "./pages/StudentClassPage";
import { AuthProvider } from "./contexts/AuthContext";
import { ClassroomProvider } from "./contexts/ClassroomContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ModerationProvider } from "./contexts/ModerationContext";
import { ModuleConfigProvider } from "./contexts/ModuleConfigContext";
import { CourseEnrollmentGuard } from "./components/guards/CourseEnrollmentGuard";
import { CalendarProvider } from "./contexts/CalendarContext";
import { RoleRoute } from "./components/RoleRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { SessionManager } from "./components/SessionManager";
import { ModerationDashboard } from "./pages/admin/ModerationDashboard";
import { FinanceDashboard } from "./pages/admin/FinanceDashboard";
import { PPDBDashboard } from "./pages/admin/PPDBDashboard";
import { AdministrationDashboard } from "./pages/admin/AdministrationDashboard";
import { UserManagement } from "./pages/admin/UserManagement";
import { AuditDashboard } from "./pages/admin/AuditDashboard";
import { AdminAnalyticsDashboard } from "./pages/admin/AdminAnalyticsDashboard";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { VerifyEmail } from "./pages/VerifyEmail";
import { TeachingHub, SocialHub, GamificationHub, AdminHub } from "./pages/Hubs";

import { GradebookProvider } from "./contexts/GradebookContext";
import { CommentProvider } from "./contexts/CommentContext";
import { StudentProgressProvider } from "./contexts/StudentProgressContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";

import { AuthGuard } from "./components/guards/AuthGuard";
import { TenantGuard } from "./components/guards/TenantGuard";
import { RoleGuard } from "./components/guards/RoleGuard";
import { RoleResolver } from "./components/guards/RoleResolver";
import { WorkspaceSelector } from "./pages/WorkspaceSelector";
import { Unauthorized } from "./pages/Unauthorized";
import { Outlet } from "react-router-dom";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <TenantProvider>
              <NotificationProvider>
                <ClassroomProvider>
                  <ModerationProvider>
                    <ModuleConfigProvider>
                      <CalendarProvider>
                        <GradebookProvider>
                          <CommentProvider>
                            <StudentProgressProvider>
                              <OfflineIndicator />
                              <SessionManager />
                              <Router>
                                <Routes>
                                  <Route path="/login" element={<Login />} />
                                  <Route path="/forgot-password" element={<ForgotPassword />} />
                                  <Route path="/reset-password" element={<ResetPassword />} />
                                  <Route path="/verify-email" element={<VerifyEmail />} />
                                  
                                  <Route path="/workspace-selector" element={<AuthGuard><WorkspaceSelector /></AuthGuard>} />
                                  <Route path="/unauthorized" element={<Unauthorized />} />
                                  <Route path="/" element={
                                    <AuthGuard>
                                      <TenantGuard>
                                        <Layout />
                                      </TenantGuard>
                                    </AuthGuard>
                                  }>
                                    {/* App prefix for role-based features */}
                                    <Route path="app">
                                      <Route index element={<RoleResolver />} />
                                    
                                    <Route path="student" element={<RoleGuard allowedRoles={['student']}><Outlet /></RoleGuard>}>
                                      <Route index element={<Dashboard />} />
                                      <Route path="dashboard" element={<Dashboard />} />
                                      <Route path="courses" element={<LessonViewer />} />
                                      <Route path="courses/:courseId" element={<CourseEnrollmentGuard><LessonViewer /></CourseEnrollmentGuard>} />
                                      <Route path="quizzes" element={<QuizModule />} />
                                      <Route path="assignments" element={<Assignments />} />
                                    </Route>

                                    <Route path="teacher" element={<RoleGuard allowedRoles={['teacher']}><Outlet /></RoleGuard>}>
                                      <Route index element={<TeacherDashboard />} />
                                      <Route path="dashboard" element={<TeacherDashboard />} />
                                      <Route path="quiz-manager" element={<QuizManager />} />
                                      <Route path="courses" element={<Courses />} />
                                    </Route>

                                    <Route path="admin" element={<RoleGuard allowedRoles={['admin']}><Outlet /></RoleGuard>}>
                                      <Route index element={<AdministrationDashboard />} />
                                      <Route path="dashboard" element={<AdministrationDashboard />} />
                                      <Route path="users" element={<UserManagement />} />
                                    </Route>

                                    </Route>

                                    {/* Legacy / unclassified routes mapping for compatibility */}
                                    <Route index element={<Navigate to="/app" replace />} />
                                    
                                    <Route path="dashboard" element={<RoleRoute role="student"><Dashboard /></RoleRoute>} />
                                    <Route path="directory" element={<RoleRoute role={['teacher', 'student', 'admin']}><Directory /></RoleRoute>} />

                                    {/* Hub Routes */}
                                    <Route path="teacher-dashboard" element={<RoleRoute role="teacher"><TeacherDashboard /></RoleRoute>} />
                                    <Route path="social-hub" element={<RoleRoute role={['teacher', 'student', 'admin']}><SocialHub /></RoleRoute>} />
                                    <Route path="gamification-hub" element={<RoleRoute role="student"><GamificationHub /></RoleRoute>} />
                                    <Route path="admin-hub" element={<RoleRoute role="admin"><AdminHub /></RoleRoute>} />

                                    <Route path="lesson" element={<RoleRoute role="student"><LessonViewer /></RoleRoute>} />
                                    <Route path="grader" element={<RoleRoute role={['teacher', 'admin']}><SpeedGrader /></RoleRoute>} />
                                    <Route path="quiz" element={<RoleRoute role="student"><QuizModule /></RoleRoute>} />
                                    <Route path="billing" element={<RoleRoute role="admin"><BillingDashboard /></RoleRoute>} />
                                    <Route path="creator" element={<RoleRoute role={['teacher', 'admin']}><Creator /></RoleRoute>} />
                                    <Route path="leaderboard" element={<RoleRoute role="student"><Leaderboard /></RoleRoute>} />
                                    <Route path="forum" element={<RoleRoute role={['teacher', 'student', 'admin']}><Forum /></RoleRoute>} />
                                    <Route path="profile" element={<RoleRoute role={['teacher', 'student', 'admin']}><Profile /></RoleRoute>} />
                                    <Route path="p/:username" element={<RoleRoute role={['teacher', 'student', 'admin']}><PublicProfile /></RoleRoute>} />
                                    <Route path="settings" element={<RoleRoute role={['teacher', 'student', 'admin']}><Settings /></RoleRoute>} />
                                    <Route path="analytics" element={<RoleRoute role={['teacher', 'admin']}><Analytics /></RoleRoute>} />
                                    <Route path="scan-attendance" element={<RoleRoute role={['teacher', 'admin']}><ScanAttendance /></RoleRoute>} />
                                    <Route path="documents" element={<RoleRoute role={['teacher', 'admin']}><DocumentManager /></RoleRoute>} />
                                    <Route path="gradebook" element={<RoleRoute role={['teacher', 'admin']}><Gradebook /></RoleRoute>} />
                                    <Route path="teaching/quiz-gradebook" element={<RoleRoute role={['teacher', 'admin']}><QuizGradebook /></RoleRoute>} />
                                    <Route path="teaching/assignment-gradebook" element={<RoleRoute role={['teacher', 'admin']}><AssignmentGradebook /></RoleRoute>} />
                                    <Route path="teaching" element={<RoleRoute role="teacher"><TeachingHub /></RoleRoute>} />
                                    <Route path="teaching/courses" element={<RoleRoute role={['teacher', 'admin']}><Courses /></RoleRoute>} />
                                    <Route path="teaching/question-bank" element={<RoleRoute role={['teacher', 'admin']}><QuestionBankPage /></RoleRoute>} />
                                    <Route path="teaching/course-builder" element={<RoleRoute role={['teacher', 'admin']}><CourseBuilder /></RoleRoute>} />
                                    <Route path="teaching/quiz-manager" element={<RoleRoute role={['teacher', 'admin']}><QuizManager /></RoleRoute>} />
                                    <Route path="teaching/classes" element={<RoleRoute role={['teacher', 'admin']}><ClassManagement /></RoleRoute>} />
                                    <Route path="certificates" element={<RoleRoute role="student"><Certificates /></RoleRoute>} />
                                    <Route path="calendar" element={<RoleRoute role={['teacher', 'student', 'admin']}><Calendar /></RoleRoute>} />
                                    <Route path="schedule" element={<RoleRoute role={['teacher', 'student', 'admin']}><Calendar /></RoleRoute>} />
                                    <Route path="announcements" element={<RoleRoute role={['teacher', 'student', 'admin']}><Announcements /></RoleRoute>} />
                                    <Route path="assignments" element={<RoleRoute role={['teacher', 'student', 'admin']}><Assignments /></RoleRoute>} />
                                    <Route path="student-progress/:studentId" element={<RoleRoute role={['teacher', 'admin']}><StudentProgress /></RoleRoute>} />
                                    <Route path="group-assignment" element={<RoleRoute role={['teacher', 'student', 'admin']}><GroupAssignment /></RoleRoute>} />
                                    <Route path="admin/moderation" element={<RoleRoute role={['teacher', 'admin']}><ModerationDashboard /></RoleRoute>} />
                                    <Route path="admin/finance" element={<RoleRoute role="admin"><FinanceDashboard /></RoleRoute>} />
                                    <Route path="admin/ppdb" element={<RoleRoute role="admin"><PPDBDashboard /></RoleRoute>} />
                                    <Route path="admin/administration" element={<RoleRoute role="admin"><AdministrationDashboard /></RoleRoute>} />
                                    <Route path="admin/users" element={<RoleRoute role="admin"><UserManagement /></RoleRoute>} />
                                    <Route path="admin/audit" element={<RoleRoute role="admin"><AuditDashboard /></RoleRoute>} />
                                    <Route path="admin/analytics" element={<RoleRoute role="admin"><AdminAnalyticsDashboard /></RoleRoute>} />
                                    <Route path="courses" element={<RoleRoute role="student"><LessonViewer /></RoleRoute>} />
                                    <Route path="courses/:courseId" element={
                                      <RoleRoute role={['student', 'teacher', 'admin']}>
                                        <CourseEnrollmentGuard>
                                          <LessonViewer />
                                        </CourseEnrollmentGuard>
                                      </RoleRoute>
                                    } />
                                    <Route path="classes/:classId" element={<RoleRoute role="student"><StudentClassPage /></RoleRoute>} />
                                  
                                  </Route>

                                </Routes>
                              </Router>
                            </StudentProgressProvider>
                          </CommentProvider>
                        </GradebookProvider>
                      </CalendarProvider>
                    </ModuleConfigProvider>
                  </ModerationProvider>
                </ClassroomProvider>
              </NotificationProvider>
            </TenantProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
