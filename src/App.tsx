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
import { Certificates } from "./pages/Certificates";
import { Calendar } from "./pages/Calendar";
import { Announcements } from "./pages/Announcements";
import { Assignments } from "./pages/Assignments";
import { StudentProgress } from "./pages/StudentProgress";
import { GroupAssignment } from "./pages/GroupAssignment";
import { AuthProvider } from "./contexts/AuthContext";
import { ClassroomProvider } from "./contexts/ClassroomContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ModerationProvider } from "./contexts/ModerationContext";
import { ModuleConfigProvider } from "./contexts/ModuleConfigContext";
import { CalendarProvider } from "./contexts/CalendarContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { SessionManager } from "./components/SessionManager";
import { ModerationDashboard } from "./pages/admin/ModerationDashboard";
import { FinanceDashboard } from "./pages/admin/FinanceDashboard";
import { PPDBDashboard } from "./pages/admin/PPDBDashboard";
import { AdministrationDashboard } from "./pages/admin/AdministrationDashboard";
import { Login } from "./pages/Login";
import { TeachingHub, SocialHub, GamificationHub, AdminHub } from "./pages/Hubs";

import { GradebookProvider } from "./contexts/GradebookContext";
import { CommentProvider } from "./contexts/CommentContext";
import { StudentProgressProvider } from "./contexts/StudentProgressContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { TenantProvider } from "./contexts/TenantContext";

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
                                  <Route path="/" element={<Layout />}>
                                    <Route index element={<ProtectedRoute allowedRoles={['student']}><Dashboard /></ProtectedRoute>} />
                                    <Route path="directory" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Directory /></ProtectedRoute>} />

                                    {/* Hub Routes */}
                                    <Route path="teacher-dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
                                    <Route path="social-hub" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><SocialHub /></ProtectedRoute>} />
                                    <Route path="gamification-hub" element={<ProtectedRoute allowedRoles={['student']}><GamificationHub /></ProtectedRoute>} />
                                    <Route path="admin-hub" element={<ProtectedRoute allowedRoles={['admin']}><AdminHub /></ProtectedRoute>} />

                                    <Route path="lesson" element={<ProtectedRoute allowedRoles={['student']}><LessonViewer /></ProtectedRoute>} />
                                    <Route path="grader" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><SpeedGrader /></ProtectedRoute>} />
                                    <Route path="quiz" element={<ProtectedRoute allowedRoles={['student']}><QuizModule /></ProtectedRoute>} />
                                    <Route path="billing" element={<ProtectedRoute allowedRoles={['admin']}><BillingDashboard /></ProtectedRoute>} />
                                    <Route path="creator" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><Creator /></ProtectedRoute>} />
                                    <Route path="leaderboard" element={<ProtectedRoute allowedRoles={['student']}><Leaderboard /></ProtectedRoute>} />
                                    <Route path="forum" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Forum /></ProtectedRoute>} />
                                    <Route path="profile" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Profile /></ProtectedRoute>} />
                                    <Route path="p/:username" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><PublicProfile /></ProtectedRoute>} />
                                    <Route path="settings" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Settings /></ProtectedRoute>} />
                                    <Route path="analytics" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><Analytics /></ProtectedRoute>} />
                                    <Route path="scan-attendance" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><ScanAttendance /></ProtectedRoute>} />
                                    <Route path="documents" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><DocumentManager /></ProtectedRoute>} />
                                    <Route path="gradebook" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><Gradebook /></ProtectedRoute>} />
                                    <Route path="teaching/course-builder" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><CourseBuilder /></ProtectedRoute>} />
                                    <Route path="certificates" element={<ProtectedRoute allowedRoles={['student']}><Certificates /></ProtectedRoute>} />
                                    <Route path="calendar" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Calendar /></ProtectedRoute>} />
                                    <Route path="schedule" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Calendar /></ProtectedRoute>} />
                                    <Route path="announcements" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Announcements /></ProtectedRoute>} />
                                    <Route path="assignments" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><Assignments /></ProtectedRoute>} />
                                    <Route path="student-progress/:studentId" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><StudentProgress /></ProtectedRoute>} />
                                    <Route path="group-assignment" element={<ProtectedRoute allowedRoles={['teacher', 'student', 'admin']}><GroupAssignment /></ProtectedRoute>} />
                                    <Route path="admin/moderation" element={<ProtectedRoute allowedRoles={['teacher', 'admin']}><ModerationDashboard /></ProtectedRoute>} />
                                    <Route path="admin/finance" element={<ProtectedRoute allowedRoles={['admin']}><FinanceDashboard /></ProtectedRoute>} />
                                    <Route path="admin/ppdb" element={<ProtectedRoute allowedRoles={['admin']}><PPDBDashboard /></ProtectedRoute>} />
                                    <Route path="admin/administration" element={<ProtectedRoute allowedRoles={['admin']}><AdministrationDashboard /></ProtectedRoute>} />
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
