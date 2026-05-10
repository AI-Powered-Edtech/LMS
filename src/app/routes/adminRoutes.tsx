import { Navigate, Outlet, Route } from "react-router-dom";

import { RoleGuard } from "../../components/guards/RoleGuard";
import {
  AcademicYears,
  AdaptivePathsPage,
  AdminAnalyticsDashboard,
  AdministrationDashboard,
  AkmStimuli,
  AssignmentGradebook,
  AuditDashboard,
  BankVa,
  BillingDashboard,
  BosTracking,
  ClassManagement,
  CourseAnalytics,
  CourseBuilder,
  Courses,
  Creator,
  DocumentManager,
  FeatureFlagsPage,
  FinanceDashboard,
  Gradebook,
  Integrations,
  LtiManagement,
  ModerationDashboard,
  NotFound,
  P5Projects,
  ParentLinks,
  PlagiarismDashboard,
  PPDBDashboard,
  PpdbJalur,
  PrincipalInsights,
  QuestionBankPage,
  QuizGradebook,
  QuizManager,
  Rapor,
  RaporPrint,
  ReviewQueue,
  RombelManagement,
  ScanAttendance,
  SemanticSearch,
  SemesterPage,
  SpeedGrader,
  StaffDossier,
  StruggleDashboard,
  StudentDossier,
  StudentProgress,
  Subjects,
  SystemHealth,
  Timetable,
  UserManagement,
} from "../lazyPages";
import { S } from "./utils";

/**
 * All /app/admin/* routes.
 */
export function AdminRoutes() {
  return (
    <Route
      path="admin"
      element={
        <RoleGuard allowedRoles={["admin"]}>
          <Outlet />
        </RoleGuard>
      }
    >
      <Route
        index
        element={
          <S>
            <AdministrationDashboard />
          </S>
        }
      />
      <Route
        path="dashboard"
        element={
          <S>
            <AdministrationDashboard />
          </S>
        }
      />
      <Route
        path="users"
        element={
          <S>
            <UserManagement />
          </S>
        }
      />
      <Route
        path="billing"
        element={
          <S>
            <BillingDashboard />
          </S>
        }
      />
      <Route
        path="moderation"
        element={
          <S>
            <ModerationDashboard />
          </S>
        }
      />
      <Route
        path="reviews/pending"
        element={
          <S feature="Antrean Review">
            <ReviewQueue />
          </S>
        }
      />
      <Route
        path="reviews"
        element={<Navigate to="/app/admin/reviews/pending" replace />}
      />
      <Route
        path="finance"
        element={
          <S>
            <FinanceDashboard />
          </S>
        }
      />
      <Route
        path="ppdb"
        element={
          <S>
            <PPDBDashboard />
          </S>
        }
      />
      <Route
        path="administration"
        element={
          <S>
            <AdministrationDashboard />
          </S>
        }
      />
      <Route
        path="audit"
        element={
          <S>
            <AuditDashboard />
          </S>
        }
      />
      <Route
        path="analytics"
        element={
          <S>
            <AdminAnalyticsDashboard />
          </S>
        }
      />
      <Route
        path="course-analytics"
        element={
          <S feature="Course Analytics">
            <CourseAnalytics />
          </S>
        }
      />
      <Route
        path="documents"
        element={
          <S>
            <DocumentManager />
          </S>
        }
      />
      <Route
        path="creator"
        element={
          <S>
            <Creator />
          </S>
        }
      />
      <Route
        path="ai-quiz-gen"
        element={<Navigate to="/app/admin/creator" replace />}
      />
      <Route
        path="ai-generator"
        element={<Navigate to="/app/admin/creator" replace />}
      />
      <Route
        path="courses"
        element={
          <S>
            <Courses />
          </S>
        }
      />
      <Route
        path="course-builder"
        element={
          <S>
            <CourseBuilder />
          </S>
        }
      />
      <Route
        path="quiz-manager"
        element={
          <S>
            <QuizManager />
          </S>
        }
      />
      <Route
        path="question-bank"
        element={
          <S>
            <QuestionBankPage />
          </S>
        }
      />
      <Route
        path="gradebook"
        element={
          <S>
            <Gradebook />
          </S>
        }
      />
      <Route
        path="quiz-gradebook"
        element={
          <S>
            <QuizGradebook />
          </S>
        }
      />
      <Route
        path="assignment-gradebook"
        element={
          <S>
            <AssignmentGradebook />
          </S>
        }
      />
      <Route
        path="grader"
        element={
          <S>
            <SpeedGrader />
          </S>
        }
      />
      <Route
        path="classes"
        element={
          <S>
            <ClassManagement />
          </S>
        }
      />
      <Route
        path="scan-attendance"
        element={
          <S>
            <ScanAttendance />
          </S>
        }
      />
      <Route
        path="student-progress/:studentId"
        element={
          <S>
            <StudentProgress />
          </S>
        }
      />
      <Route
        path="system-health"
        element={
          <S>
            <SystemHealth />
          </S>
        }
      />
      <Route
        path="feature-flags"
        element={
          <S>
            <FeatureFlagsPage />
          </S>
        }
      />
      <Route
        path="semester"
        element={
          <S>
            <SemesterPage />
          </S>
        }
      />
      <Route
        path="academic-years"
        element={
          <S feature="Tahun Ajaran">
            <AcademicYears />
          </S>
        }
      />
      <Route
        path="rombel"
        element={
          <S feature="Manajemen Rombel">
            <RombelManagement />
          </S>
        }
      />
      <Route
        path="subjects"
        element={
          <S feature="Mata Pelajaran">
            <Subjects />
          </S>
        }
      />
      <Route
        path="timetable"
        element={
          <S feature="Jadwal Pelajaran">
            <Timetable />
          </S>
        }
      />
      <Route
        path="rapor"
        element={
          <S feature="Rapor Kurmer">
            <Rapor />
          </S>
        }
      />
      <Route
        path="bos"
        element={
          <S feature="BOS Tracking">
            <BosTracking />
          </S>
        }
      />
      <Route
        path="ppdb-jalur"
        element={
          <S feature="PPDB Jalur">
            <PpdbJalur />
          </S>
        }
      />
      <Route
        path="p5"
        element={
          <S feature="Projek P5">
            <P5Projects />
          </S>
        }
      />
      <Route
        path="integrations"
        element={
          <S feature="Integrasi">
            <Integrations />
          </S>
        }
      />
      <Route
        path="insights"
        element={
          <S feature="Wawasan Bulanan">
            <PrincipalInsights />
          </S>
        }
      />
      <Route
        path="student-dossier/:profileId"
        element={
          <S feature="Dossier Siswa">
            <StudentDossier />
          </S>
        }
      />
      <Route
        path="akm-stimuli"
        element={
          <S feature="Stimulus AKM">
            <AkmStimuli />
          </S>
        }
      />
      <Route
        path="bank-va"
        element={
          <S feature="Virtual Account Bank">
            <BankVa />
          </S>
        }
      />
      <Route
        path="parent-links"
        element={
          <S feature="Tautan Orang Tua">
            <ParentLinks />
          </S>
        }
      />
      <Route
        path="search"
        element={
          <S feature="Pencarian Semantik">
            <SemanticSearch />
          </S>
        }
      />
      <Route
        path="staff-dossier/:profileId"
        element={
          <S feature="Dossier Staf">
            <StaffDossier />
          </S>
        }
      />
      <Route
        path="rapor/print/:raporId"
        element={
          <S feature="Cetak Rapor">
            <RaporPrint />
          </S>
        }
      />
      <Route
        path="struggle"
        element={
          <S feature="Deteksi Kesulitan">
            <StruggleDashboard />
          </S>
        }
      />
      <Route
        path="lti"
        element={
          <S feature="Pengaturan LTI">
            <LtiManagement />
          </S>
        }
      />
      <Route
        path="adaptive-paths"
        element={
          <S feature="Jalur Adaptif">
            <AdaptivePathsPage />
          </S>
        }
      />
      <Route
        path="plagiarism"
        element={
          <S feature="Laporan Plagiarisme">
            <PlagiarismDashboard />
          </S>
        }
      />
      <Route
        path="*"
        element={
          <S>
            <NotFound />
          </S>
        }
      />
    </Route>
  );
}
