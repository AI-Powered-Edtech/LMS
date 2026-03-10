import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { notificationService, Notification } from '../services/notificationService';
import { useToast } from './ToastContext';

export type { Notification } from '../services/notificationService';

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
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return; }
    try {
      const data = await notificationService.fetchNotifications(user.id);
      setNotifications(data);
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
        const newNotif = payload.new as Notification;
        setNotifications(prev => [newNotif, ...prev]);

        // Fire toast for real-time notification
        toast(newNotif.message, 'info');
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const addNotification = useCallback(async (notification: { title: string; message: string; type?: string }) => {
    if (!user) return;
    try {
      await notificationService.sendNotification(user.id, notification.title, notification.message, notification.type);
      // Let realtime subscription handle the UI update if possible, or fetch
      await fetchNotifications();
    } catch (error) {
      console.error('Error adding notification:', error);
    }
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user]);

  const sendNotification = useCallback(async (userId: string, message: string, type?: string) => {
    try {
      await notificationService.sendNotification(userId, 'Notifikasi', message, type);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
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
