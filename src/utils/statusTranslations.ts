/**
 * Status string translation utilities.
 * Use these whenever displaying a status value in the UI — never render raw DB status strings.
 */

export function translateCourseStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draf',
    published: 'Diterbitkan',
    archived: 'Diarsipkan',
    in_review: 'Dalam Peninjauan',
    approved: 'Disetujui',
  }
  return map[status.toLowerCase()] ?? status
}

export function translateAssignmentStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Menunggu',
    submitted: 'Dikumpulkan',
    graded: 'Dinilai',
    late: 'Terlambat',
    missing: 'Belum Dikumpulkan',
    active: 'Aktif',
    inactive: 'Tidak Aktif',
    assigned: 'Ditugaskan',
    turned_in: 'Dikumpulkan',
    returned: 'Dikembalikan',
  }
  return map[status.toLowerCase()] ?? status
}

export function translateQuizStatus(status: string): string {
  const map: Record<string, string> = {
    draft: 'Draf',
    published: 'Diterbitkan',
    submitted: 'Dikumpulkan',
    graded: 'Dinilai',
    in_progress: 'Sedang Dikerjakan',
  }
  return map[status.toLowerCase()] ?? status
}

export function translateInvitationStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'Menunggu',
    accepted: 'Diterima',
    expired: 'Kadaluarsa',
    revoked: 'Dicabut',
  }
  return map[status.toLowerCase()] ?? status
}

export function translateQuizAttemptStatus(status: string): string {
  const map: Record<string, string> = {
    completed: 'Selesai',
    in_progress: 'Berlangsung',
    submitted: 'Dikumpulkan',
    graded: 'Dinilai',
    timed_out: 'Waktu Habis',
  }
  return map[status.toLowerCase()] ?? status
}

export function translateLessonType(type: string): string {
  const map: Record<string, string> = {
    article: 'Artikel',
    video: 'Video',
    quiz: 'Kuis',
    scorm: 'SCORM',
    assignment: 'Tugas',
  }
  return map[type.toLowerCase()] ?? type
}

export function translateContentType(type: string): string {
  const map: Record<string, string> = {
    post: 'Postingan',
    comment: 'Komentar',
    assignment: 'Tugas',
    user: 'Pengguna',
  }
  return map[type.toLowerCase()] ?? type
}

export function translateEventType(type: string): string {
  const map: Record<string, string> = {
    class: 'Kelas',
    exam: 'Ujian',
    assignment: 'Tugas',
    meeting: 'Rapat',
    holiday: 'Libur',
    event: 'Acara',
    deadline: 'Tenggat',
    quiz: 'Kuis',
    lesson: 'Pelajaran',
  }
  return map[type.toLowerCase()] ?? type
}
