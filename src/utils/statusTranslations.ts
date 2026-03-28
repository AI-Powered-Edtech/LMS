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
