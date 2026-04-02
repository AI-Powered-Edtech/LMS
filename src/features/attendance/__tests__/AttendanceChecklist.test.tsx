import { fireEvent,render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AttendanceChecklist } from '../components/AttendanceChecklist'
import type { AttendanceStudentDetail,ClassStudent } from '../types'

const mockStudents: ClassStudent[] = [
  { student_id: 's1', full_name: 'Andi Pratama' },
  { student_id: 's2', full_name: 'Budi Santoso' },
  { student_id: 's3', full_name: 'Citra Dewi' },
]

const defaultDetails: AttendanceStudentDetail[] = [
  { student_id: 's1', name: 'Andi Pratama', status: 'hadir' },
  { student_id: 's2', name: 'Budi Santoso', status: 'hadir' },
  { student_id: 's3', name: 'Citra Dewi', status: 'hadir' },
]

describe('AttendanceChecklist', () => {
  it('renders all students', () => {
    const { getByText } = render(
      <AttendanceChecklist
        students={mockStudents}
        details={defaultDetails}
        onDetailsChange={() => {}}
      />
    )
    expect(getByText('Andi Pratama')).toBeTruthy()
    expect(getByText('Budi Santoso')).toBeTruthy()
    expect(getByText('Citra Dewi')).toBeTruthy()
  })

  it('shows summary counts', () => {
    const { getByText } = render(
      <AttendanceChecklist
        students={mockStudents}
        details={defaultDetails}
        onDetailsChange={() => {}}
      />
    )
    expect(getByText('Hadir: 3')).toBeTruthy()
    expect(getByText('Alpha: 0')).toBeTruthy()
  })

  it('calls onDetailsChange when status is toggled', () => {
    const onChange = vi.fn()
    const { getAllByTitle } = render(
      <AttendanceChecklist
        students={mockStudents}
        details={defaultDetails}
        onDetailsChange={onChange}
      />
    )

    // Click the first "Alpha" button (for student s1)
    const alphaButtons = getAllByTitle('Alpha')
    fireEvent.click(alphaButtons[0])

    expect(onChange).toHaveBeenCalledTimes(1)
    const newDetails = onChange.mock.calls[0][0] as AttendanceStudentDetail[]
    const s1Detail = newDetails.find((d) => d.student_id === 's1')
    expect(s1Detail?.status).toBe('alpha')
  })

  it('handles "set all" buttons', () => {
    const onChange = vi.fn()
    const { getAllByText } = render(
      <AttendanceChecklist
        students={mockStudents}
        details={defaultDetails}
        onDetailsChange={onChange}
      />
    )

    // Click "Sakit" in the "Tandai semua:" row (first "Sakit" button)
    const sakitButtons = getAllByText('Sakit')
    // The first one is in the "set all" row
    fireEvent.click(sakitButtons[0])

    expect(onChange).toHaveBeenCalledTimes(1)
    const newDetails = onChange.mock.calls[0][0] as AttendanceStudentDetail[]
    expect(newDetails.every((d) => d.status === 'sakit')).toBe(true)
  })

  it('shows empty message when no students', () => {
    const { getByText } = render(
      <AttendanceChecklist students={[]} details={[]} onDetailsChange={() => {}} />
    )
    expect(getByText('Tidak ada siswa terdaftar di kelas ini.')).toBeTruthy()
  })

  it('disables buttons when disabled prop is true', () => {
    const { getByTestId } = render(
      <AttendanceChecklist
        students={mockStudents}
        details={defaultDetails}
        onDetailsChange={() => {}}
        disabled
      />
    )
    const row = getByTestId('student-row-0')
    const buttons = row.querySelectorAll('button')
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled()
    })
  })
})
