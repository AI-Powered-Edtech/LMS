import { db } from "@/services/db";
import { logger } from "@/utils/logger";

import { Announcement, AnnouncementRSVP } from "../types";

export const announcementService = {
  /**
   * Fetch announcements for a tenant/user
   */
  async fetchAnnouncements(
    tenantId: string,
    options: {
      courseId?: string;
      limit?: number;
      offset?: number;
      status?: "draft" | "published" | "archived";
      search?: string;
    } = {},
  ) {
    let query = db
      .from("announcements")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (options.courseId) {
      query = query.or(`course_id.eq.${options.courseId},course_id.is.null`);
    } else {
      query = query.is("course_id", null);
    }

    if (options.status) {
      query = query.eq("status", options.status);
    } else {
      query = query.eq("status", "published");
    }

    if (options.search) {
      query = query.ilike("title", `%${options.search}%`);
    }

    if (options.limit) {
      const offset = options.offset || 0;
      query = query.range(offset, offset + options.limit - 1);
    }

    const { data, error } = await query;

    if (error) {
      if (import.meta.env.DEV)
        logger.error("Error fetching announcements:", error);
      throw error;
    }

    return data as unknown as Announcement[];
  },

  /**
   * Get announcement by ID with tenant isolation
   */
  async getAnnouncementById(id: string, tenantId: string) {
    const { data, error } = await db
      .from("announcements")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error) throw error;
    return data as unknown as Announcement;
  },

  /**
   * Create or update announcement
   */
  async saveAnnouncement(
    announcement: Partial<Announcement> & {
      tenant_id: string;
      created_by: string;
    },
  ) {
    const { data, error } = await db
      .from("announcements")
      .upsert(announcement)
      .select(
        `id, tenant_id, course_id, title, content, priority, target_audience,
                status, is_pinned, allow_comments, requires_rsvp, location, contact_person,
                created_by, created_at, updated_at`,
      )
      .single();

    if (error) {
      if (import.meta.env.DEV)
        logger.error("Error saving announcement:", error);
      throw error;
    }

    return data as unknown as Announcement;
  },

  /**
   * Delete announcement with tenant isolation
   */
  async deleteAnnouncement(id: string, tenantId: string) {
    const { error } = await db
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;
  },

  /**
   * Submit RSVP
   */
  async submitRSVP(
    announcementId: string,
    tenantId: string,
    userId: string,
    response: "yes" | "no" | "maybe",
  ) {
    const { data, error } = await db
      .from("announcement_rsvps")
      .upsert({
        announcement_id: announcementId,
        tenant_id: tenantId,
        user_id: userId,
        response,
        responded_at: new Date().toISOString(),
      })
      .select("id, tenant_id, announcement_id, user_id, response, responded_at")
      .single();

    if (error) {
      if (import.meta.env.DEV) logger.error("Error submitting RSVP:", error);
      throw error;
    }

    return data;
  },

  /**
   * Get RSVP status for a user/announcement with tenant isolation
   */
  async getUserRSVP(announcementId: string, userId: string, tenantId: string) {
    const { data, error } = await db
      .from("announcement_rsvps")
      .select("id, tenant_id, announcement_id, user_id, response, responded_at")
      .eq("announcement_id", announcementId)
      .eq("user_id", userId)
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) throw error;
    return data as AnnouncementRSVP | null;
  },
};
