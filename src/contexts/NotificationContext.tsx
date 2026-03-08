import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  addNotification: (notification: { title: string; message: string; type?: string }) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  sendNotification: (userId: string, message: string, type?: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return; }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setNotifications(data ?? []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addNotification = useCallback(async (notification: { title: string; message: string; type?: string }) => {
    if (!user) return;
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title: notification.title,
      message: notification.message,
      type: (notification.type?.toUpperCase() || 'INFO') as any,
      is_read: false,
    });
    if (error) console.error('Error adding notification:', error);
  }, [user]);

  const markAsRead = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) { console.error('Error marking as read:', error); return; }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    if (error) { console.error('Error marking all as read:', error); return; }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user]);

  const sendNotification = useCallback(async (userId: string, message: string, type?: string) => {
    const { error } = await supabase.from('notifications').insert({
      user_id: userId,
      title: 'Notifikasi',
      message,
      type: (type?.toUpperCase() || 'INFO') as any,
      is_read: false,
    });
    if (error) console.error('Error sending notification:', error);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{
      notifications, unreadCount, loading,
      addNotification, markAsRead, markAllAsRead, sendNotification,
      refreshNotifications: fetchNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) throw new Error('useNotifications must be used within a NotificationProvider');
  return context;
}
