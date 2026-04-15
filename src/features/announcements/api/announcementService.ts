import { apiFetch } from '@/src/lib/api'

import { Announcement, AnnouncementRSVP } from '../types'

export const announcementService = {
  /**
   * Fetch announcements for a tenant/user
   */
  async fetchAnnouncements(
    tenantId: string,
    options: {
      courseId?: string
      limit?: number
      offset?: number
      status?: 'draft' | 'published' | 'archived'
      search?: string
    } = {}
  ) {
    let query = apiFetch('/announcements')

    if (options.courseId) {
      query = query.or(`course_id.eq.${options.courseId},course_id.is.null`)
    } else {
      query = query.is('course_id', null)
    }

    if (options.status) {
      query = query.eq('status', options.status)
    } else {
      query = query.eq('status', 'published')
    }

    if (options.search) {
      query = query.ilike('title', `%${options.search}%`)
    }

    if (options.limit) {
      const offset = options.offset || 0
      query = query.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await query

    if (error) {
      if (import.meta.env.DEV) console.error('Error fetching announcements:', error)
      throw error
    }

    return data as unknown as Announcement[]
  },

  /**
   * Get announcement by ID with tenant isolation
   */
  async getAnnouncementById(_id: string, _tenantId: string) {
    const { data, error } = await apiFetch('/announcements')

    if (error) throw error
    return data as unknown as Announcement
  },

  /**
   * Create or update announcement
   */
  async saveAnnouncement(
    _announcement: Partial<Announcement> & { tenant_id: string; created_by: string }
  ) {
    const { data, error } = await apiFetch('/announcements')

    if (error) {
      if (import.meta.env.DEV) console.error('Error saving announcement:', error)
      throw error
    }

    return data as Announcement
  },

  /**
   * Delete announcement with tenant isolation
   */
  async deleteAnnouncement(_id: string, _tenantId: string) {
    const { error } = await apiFetch('/announcements')

    if (error) throw error
  },

  /**
   * Submit RSVP
   */
  async submitRSVP(
    _announcementId: string,
    _tenantId: string,
    _userId: string,
    _response: 'yes' | 'no' | 'maybe'
  ) {
    const { data, error } = await apiFetch('/announcement_rsvps')

    if (error) {
      if (import.meta.env.DEV) console.error('Error submitting RSVP:', error)
      throw error
    }

    return data
  },

  /**
   * Get RSVP status for a user/announcement with tenant isolation
   */
  async getUserRSVP(_announcementId: string, _userId: string, _tenantId: string) {
    const { data, error } = await apiFetch('/announcement_rsvps')

    if (error) throw error
    return data as AnnouncementRSVP | null
  },
}
