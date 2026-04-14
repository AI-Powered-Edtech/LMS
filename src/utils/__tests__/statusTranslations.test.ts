import { describe, expect, it } from 'vitest'

import {
  translateAssignmentStatus,
  translateCourseStatus,
  translateInvitationStatus,
  translateQuizStatus,
} from '../statusTranslations'

describe('statusTranslations', () => {
  describe('translateCourseStatus', () => {
    it('harus translate "draft" ke "Draf"', () => {
      expect(translateCourseStatus('draft')).toBe('Draf')
    })

    it('harus translate "published" ke "Diterbitkan"', () => {
      expect(translateCourseStatus('published')).toBe('Diterbitkan')
    })

    it('harus translate "archived" ke "Diarsipkan"', () => {
      expect(translateCourseStatus('archived')).toBe('Diarsipkan')
    })

    it('harus translate "in_review" ke "Dalam Peninjauan"', () => {
      expect(translateCourseStatus('in_review')).toBe('Dalam Peninjauan')
    })

    it('harus translate "approved" ke "Disetujui"', () => {
      expect(translateCourseStatus('approved')).toBe('Disetujui')
    })

    it('harus case-insensitive untuk matching', () => {
      expect(translateCourseStatus('DRAFT')).toBe('Draf')
      expect(translateCourseStatus('Published')).toBe('Diterbitkan')
    })

    it('harus return status asli jika tidak ada mapping', () => {
      expect(translateCourseStatus('unknown_status')).toBe('unknown_status')
    })

    it('harus handle string kosong', () => {
      expect(translateCourseStatus('')).toBe('')
    })
  })

  describe('translateAssignmentStatus', () => {
    it('harus translate "pending" ke "Menunggu"', () => {
      expect(translateAssignmentStatus('pending')).toBe('Menunggu')
    })

    it('harus translate "submitted" ke "Dikumpulkan"', () => {
      expect(translateAssignmentStatus('submitted')).toBe('Dikumpulkan')
    })

    it('harus translate "graded" ke "Dinilai"', () => {
      expect(translateAssignmentStatus('graded')).toBe('Dinilai')
    })

    it('harus translate "late" ke "Terlambat"', () => {
      expect(translateAssignmentStatus('late')).toBe('Terlambat')
    })

    it('harus translate "missing" ke "Belum Dikumpulkan"', () => {
      expect(translateAssignmentStatus('missing')).toBe('Belum Dikumpulkan')
    })

    it('harus translate "active" ke "Aktif"', () => {
      expect(translateAssignmentStatus('active')).toBe('Aktif')
    })

    it('harus translate "inactive" ke "Tidak Aktif"', () => {
      expect(translateAssignmentStatus('inactive')).toBe('Tidak Aktif')
    })

    it('harus translate "assigned" ke "Ditugaskan"', () => {
      expect(translateAssignmentStatus('assigned')).toBe('Ditugaskan')
    })

    it('harus translate "turned_in" ke "Dikumpulkan"', () => {
      expect(translateAssignmentStatus('turned_in')).toBe('Dikumpulkan')
    })

    it('harus translate "returned" ke "Dikembalikan"', () => {
      expect(translateAssignmentStatus('returned')).toBe('Dikembalikan')
    })

    it('harus case-insensitive untuk matching', () => {
      expect(translateAssignmentStatus('PENDING')).toBe('Menunggu')
      expect(translateAssignmentStatus('Graded')).toBe('Dinilai')
    })

    it('harus return status asli jika tidak ada mapping', () => {
      expect(translateAssignmentStatus('not_a_status')).toBe('not_a_status')
    })
  })

  describe('translateQuizStatus', () => {
    it('harus translate "draft" ke "Draf"', () => {
      expect(translateQuizStatus('draft')).toBe('Draf')
    })

    it('harus translate "published" ke "Diterbitkan"', () => {
      expect(translateQuizStatus('published')).toBe('Diterbitkan')
    })

    it('harus translate "submitted" ke "Dikumpulkan"', () => {
      expect(translateQuizStatus('submitted')).toBe('Dikumpulkan')
    })

    it('harus translate "graded" ke "Dinilai"', () => {
      expect(translateQuizStatus('graded')).toBe('Dinilai')
    })

    it('harus translate "in_progress" ke "Sedang Dikerjakan"', () => {
      expect(translateQuizStatus('in_progress')).toBe('Sedang Dikerjakan')
    })

    it('harus case-insensitive untuk matching', () => {
      expect(translateQuizStatus('DRAFT')).toBe('Draf')
      expect(translateQuizStatus('In_Progress')).toBe('Sedang Dikerjakan')
    })

    it('harus return status asli jika tidak ada mapping', () => {
      expect(translateQuizStatus('invalid_quiz_status')).toBe('invalid_quiz_status')
    })
  })

  describe('translateInvitationStatus', () => {
    it('harus translate "pending" ke "Menunggu"', () => {
      expect(translateInvitationStatus('pending')).toBe('Menunggu')
    })

    it('harus translate "accepted" ke "Diterima"', () => {
      expect(translateInvitationStatus('accepted')).toBe('Diterima')
    })

    it('harus translate "expired" ke "Kadaluarsa"', () => {
      expect(translateInvitationStatus('expired')).toBe('Kadaluarsa')
    })

    it('harus translate "revoked" ke "Dicabut"', () => {
      expect(translateInvitationStatus('revoked')).toBe('Dicabut')
    })

    it('harus case-insensitive untuk matching', () => {
      expect(translateInvitationStatus('PENDING')).toBe('Menunggu')
      expect(translateInvitationStatus('Accepted')).toBe('Diterima')
    })

    it('harus return status asli jika tidak ada mapping', () => {
      expect(translateInvitationStatus('unknown_invitation_status')).toBe(
        'unknown_invitation_status'
      )
    })
  })
})
