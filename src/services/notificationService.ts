import { supabase } from '../lib/supabase';

export interface Notification {
    id: string;
    tenant_id: string;
    user_id: string;
    actor_id: string | null;
    title: string;
    message: string;
    type: 'grade' | 'discussion_reply' | 'announcement' | 'system';
    entity_id: string | null;
    link: string | null;
    is_read: boolean;
    created_at: string;
    actor?: {
        full_name: string;
        avatar_url: string | null;
    };
}

export const notificationService = {
    /**
     * Fetch user notifications
     */
    async fetchNotifications(userId: string) {
        const { data, error } = await supabase
            .from('notifications')
            .select(`
                *,
                actor:actor_id (
                    full_name,
                    avatar_url
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }

        return data as Notification[];
    },

    /**
     * Mark a single notification as read
     */
    async markAsRead(id: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', id);

        if (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    },

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId: string) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error marking all notifications as read:', error);
            throw error;
        }
    },

    /**
     * Send a notification manually (System)
     */
    async sendNotification(userId: string, title: string, message: string, type: string = 'system') {
        const { data: profile } = await supabase.from('user_profiles').select('tenant_id').eq('id', userId).single();
        if (!profile) throw new Error('User profile not found');

        const { error } = await supabase
            .from('notifications')
            .insert({
                tenant_id: profile.tenant_id,
                user_id: userId,
                title,
                message,
                type
            });

        if (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    },

    /**
     * Get unread notification count
     */
    async getUnreadCount(userId: string) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            console.error('Error getting unread count:', error);
            throw error;
        }

        return count || 0;
    },

    /**
     * Subscribe to real-time notifications
     */
    subscribe(userId: string, onNewNotification: (notification: Notification) => void) {
        return supabase
            .channel(`notifications:${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    onNewNotification(payload.new as Notification);
                }
            )
            .subscribe();
    }
};
