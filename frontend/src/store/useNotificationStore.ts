import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'post' | 'join' | 'comment' | 'like';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  fromUser?: {
    name: string;
    photoURL?: string;
  };
  postId?: string;
  communityId?: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({ 
    notifications,
    unreadCount: notifications.filter(n => !n.read).length 
  }),
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),
  markAsRead: (notificationId) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    ),
    unreadCount: Math.max(0, state.unreadCount - 1)
  })),
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0
  })),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
}));

