import { Navigate, Route, useParams } from 'react-router-dom'

// ============================================================
// Parameterized redirect helpers (Navigate cannot interpolate :params)
// ============================================================

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

// ============================================================
// Static redirects — old path → new path
// ============================================================

const STATIC_REDIRECTS: Array<[string, string]> = [
  ['dashboard', '/app/student/dashboard'],
  ['lesson', '/app/student/courses'],
  ['quiz', '/app/student/quizzes'],
  ['courses', '/app/student/courses'],
  ['certificates', '/app/student/certificates'],
  ['grades', '/app/student/grades'],
  ['attendance', '/app/student/attendance'],
  ['gamification-hub', '/app/student/gamification'],
  ['leaderboard', '/app/student/leaderboard'],
  ['teacher-dashboard', '/app/teacher/dashboard'],
  ['teaching', '/app/teacher/teaching-hub'],
  ['teaching/courses', '/app/teacher/courses'],
  ['teaching/course-builder', '/app/teacher/course-builder'],
  ['teaching/quiz-manager', '/app/teacher/quiz-manager'],
  ['teaching/question-bank', '/app/teacher/question-bank'],
  ['teaching/quiz-gradebook', '/app/teacher/quiz-gradebook'],
  ['teaching/assignment-gradebook', '/app/teacher/assignment-gradebook'],
  ['teaching/course-analytics', '/app/teacher/course-analytics'],
  ['teaching/dashboards', '/app/teacher/dashboards'],
  ['teaching/classes', '/app/teacher/classes'],
  ['grader', '/app/teacher/grader'],
  ['gradebook', '/app/teacher/gradebook'],
  ['analytics', '/app/teacher/analytics'],
  ['scan-attendance', '/app/teacher/scan-attendance'],
  ['documents', '/app/teacher/documents'],
  ['creator', '/app/teacher/creator'],
  ['admin-hub', '/app/admin/dashboard'],
  ['admin/moderation', '/app/admin/moderation'],
  ['admin/finance', '/app/admin/finance'],
  ['admin/ppdb', '/app/admin/ppdb'],
  ['admin/administration', '/app/admin/administration'],
  ['admin/users', '/app/admin/users'],
  ['admin/audit', '/app/admin/audit'],
  ['admin/analytics', '/app/admin/analytics'],
  ['billing', '/app/admin/billing'],
  ['schedule', '/calendar'],
]

// ============================================================
// LegacyRedirects — renders all redirect <Route> elements
// ============================================================

export function LegacyRedirects() {
  return (
    <>
      <Route index element={<Navigate to="/app" replace />} />
      {STATIC_REDIRECTS.map(([from, to]) => (
        <Route key={from} path={from} element={<Navigate to={to} replace />} />
      ))}
      <Route path="courses/:courseId" element={<RedirectCourseDetail />} />
      <Route path="classes/:classId" element={<RedirectStudentClass />} />
      <Route path="student-progress/:studentId" element={<RedirectStudentProgress />} />
    </>
  )
}
