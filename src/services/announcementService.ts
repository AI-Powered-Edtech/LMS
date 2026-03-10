import { supabase } from '../lib/supabase';

export interface Announcement {
    id: string;
    tenant_id: string;
    course_id: string | null;
    title: string;
    content: string;
    priority: 'low' | 'normal' | 'high';
    target_audience: 'course_students' | 'course_staff' | 'all_students' | 'system';
    status: 'draft' | 'published' | 'archived';
    is_pinned: boolean;
    allow_comments: boolean;
    requires_rsvp: boolean;
    location: string | null;
    contact_person: string | null;
    created_by: string;
    created_at: string;
    updated_at: string;
    author?: {
        full_name: string;
        avatar_url: string | null;
    };
    rsvp_status?: 'yes' | 'no' | 'maybe';
}

export interface AnnouncementRSVP {
    id: string;
    tenant_id: string;
    announcement_id: string;
    user_id: string;
    response: 'yes' | 'no' | 'maybe';
    responded_at: string;
}

export const announcementService = {
    /**
     * Fetch announcements for a tenant/user
     */
    async fetchAnnouncements(tenantId: string, options: {
        courseId?: string,
        limit?: number,
        offset?: number,
        status?: 'draft' | 'published' | 'archived',
        search?: string
    } = {}) {
        let query = supabase
            .from('announcements')
            .select(`
                *,
                author:created_by (
                    full_name,
                    avatar_url
                )
            `)
            .eq('tenant_id', tenantId)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        if (options.courseId) {
            query = query.or(`course_id.eq.${options.courseId},course_id.is.null`);
        } else {
            query = query.is('course_id', null);
        }

        if (options.status) {
            query = query.eq('status', options.status);
        } else {
            query = query.eq('status', 'published');
        }

        if (options.search) {
            query = query.ilike('title', `%${options.search}%`);
        }

        if (options.limit) {
            const offset = options.offset || 0;
            query = query.range(offset, offset + options.limit - 1);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching announcements:', error);
            throw error;
        }

        return data as Announcement[];
    },

    /**
     * Get unread count for notifications (integrated here if needed or in notificationService)
     */
    async getAnnouncementById(id: string) {
        const { data, error } = await supabase
            .from('announcements')
            .select(`
                *,
                author:created_by (
                    full_name,
                    avatar_url
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as Announcement;
    },

    /**
     * Create or update announcement
     */
    async saveAnnouncement(announcement: Partial<Announcement> & { tenant_id: string, created_by: string }) {
        const { data, error } = await supabase
            .from('announcements')
            .upsert(announcement)
            .select()
            .single();

        if (error) {
            console.error('Error saving announcement:', error);
            throw error;
        }

        return data as Announcement;
    },

    /**
     * Delete announcement
     */
    async deleteAnnouncement(id: string) {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Submit RSVP
     */
    async submitRSVP(announcementId: string, tenantId: string, userId: string, response: 'yes' | 'no' | 'maybe') {
        const { data, error } = await supabase
            .from('announcement_rsvps')
            .upsert({
                announcement_id: announcementId,
                tenant_id: tenantId,
                user_id: userId,
                response,
                responded_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('Error submitting RSVP:', error);
            throw error;
        }

        return data;
    },

    /**
     * Get RSVP status for a user/announcement
     */
    async getUserRSVP(announcementId: string, userId: string) {
        const { data, error } = await supabase
            .from('announcement_rsvps')
            .select('*')
            .eq('announcement_id', announcementId)
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        return data as AnnouncementRSVP | null;
    }
};
