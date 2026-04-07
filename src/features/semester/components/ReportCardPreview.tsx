import { Calendar, FileText, Loader2, User } from 'lucide-react'

import { Card, EmptyState } from '@/components/ui'
import { Badge } from '@/components/ui'

import { useSemesterReportCard } from '../queries/useSemesterReportCard'
import type { CourseGrade, ReportCardData } from '../types'

interface ReportCardPreviewProps {
  semesterId: string
  studentId: string
}

function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    case 'B':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    case 'C':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
    case 'D':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
    case 'F':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
}

export function ReportCardPreview({ semesterId, studentId }: ReportCardPreviewProps) {
  const { data: reportCard, isLoading, error } = useSemesterReportCard(semesterId, studentId)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        <span className="ml-3 text-gray-500 dark:text-gray-400">Memuat rapor...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/30 dark:text-red-200 dark:border dark:border-red-800">
        Gagal memuat data rapor. Silakan coba lagi.
      </div>
    )
  }

  if (!reportCard) {
    return (
      <EmptyState
        title="Tidak ada data rapor"
        description="Belum ada data rapor untuk siswa ini."
        icon={<FileText className="h-8 w-8" />}
      />
    )
  }

  const data = reportCard as ReportCardData
  const courses: CourseGrade[] = data.courses ?? []
  const attendance = data.attendance_summary ?? { present: 0, absent: 0, sick: 0, permission: 0 }
  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5" />
            Rapor Semester
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Nama Siswa</p>
                <p className="font-medium dark:text-white">{data.student_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Semester</p>
                <p className="font-medium dark:text-white">{data.semester_name}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Grades */}
      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Nilai Mata Pelajaran
          </h2>
          {courses.length === 0 ? (
            <p className="py-4 text-center text-gray-500 dark:text-gray-400">
              Belum ada nilai untuk semester ini.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Mata Pelajaran
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Nilai Akhir
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Predikat
                    </th>
                    <th className="text-left py-3 px-2 font-medium text-gray-600 dark:text-gray-300">
                      Guru
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course: CourseGrade, index: number) => (
                    <tr key={index} className="border-b dark:border-gray-700">
                      <td className="py-3 px-2 font-medium dark:text-gray-200">
                        {course.course_name}
                      </td>
                      <td className="py-3 px-2 dark:text-gray-300">
                        {course.final_score.toFixed(1)}
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={getGradeColor(course.grade_letter)}>
                          {course.grade_letter}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 dark:text-gray-300">{course.teacher_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {/* Attendance */}
      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Ringkasan Kehadiran
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-green-50 p-4 text-center dark:bg-green-900/30 dark:border dark:border-green-800">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {attendance.present}
              </p>
              <p className="text-sm text-green-700 dark:text-green-300">Hadir</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4 text-center dark:bg-red-900/30 dark:border dark:border-red-800">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {attendance.absent}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">Alpa</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-4 text-center dark:bg-yellow-900/30 dark:border dark:border-yellow-800">
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {attendance.sick}
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">Sakit</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center dark:bg-blue-900/30 dark:border dark:border-blue-800">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {attendance.permission}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">Izin</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Teacher Notes */}
      <Card>
        <div className="p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Catatan Guru</h2>
          {data.teacher_notes ? (
            <p className="text-gray-700 dark:text-gray-300">{data.teacher_notes}</p>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 italic">Belum ada catatan guru.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
