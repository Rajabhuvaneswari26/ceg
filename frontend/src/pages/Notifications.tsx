import React, { useState, useEffect } from 'react';
import { Bell, Heart, MessageCircle, Users, Check, CheckCheck } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { collection, query, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

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

const Notifications: React.FC = () => {
  const { user } = useAuthStore();
  const { notifications, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;

    // Listen to user's notifications
    const notificationsQuery = query(
      collection(db!, 'users', user.uid, 'notifications'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Notification[];
      
      setNotifications(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, setNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user || !db) return;

    try {
      await updateDoc(doc(db!, 'users', user.uid, 'notifications', notificationId), {
        read: true
      });
      markAsRead(notificationId);
      toast.success('Notification marked as read');
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user || !db) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update all unread notifications
      const updatePromises = unreadNotifications.map(notification =>
        updateDoc(doc(db!, 'users', user.uid, 'notifications', notification.id), {
          read: true
        })
      );
      
      await Promise.all(updatePromises);
      markAllAsRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="w-5 h-5 text-red-500" />;
      case 'comment':
        return <MessageCircle className="w-5 h-5 text-blue-500" />;
      case 'join':
        return <Users className="w-5 h-5 text-green-500" />;
      case 'post':
        return <Bell className="w-5 h-5 text-primary-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 
              ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
              : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            onClick={handleMarkAllAsRead}
          >
            <CheckCheck className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications */}
      <div className="space-y-4">
        {notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card 
              key={notification.id} 
              className={`${!notification.read ? 'bg-primary-50 border-primary-200' : ''} transition-colors`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`text-sm font-medium ${!notification.read ? 'text-primary-900' : 'text-gray-900'}`}>
                        {notification.title}
                      </h3>
                      <p className={`text-sm mt-1 ${!notification.read ? 'text-primary-700' : 'text-gray-600'}`}>
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="ml-4 p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  
                  {notification.fromUser && (
                    <div className="flex items-center space-x-2 mt-3">
                      {notification.fromUser.photoURL ? (
                        <img
                          src={notification.fromUser.photoURL}
                          alt={notification.fromUser.name}
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                      )}
                      <span className="text-xs text-gray-500">
                        from {notification.fromUser.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Bell className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-500 mb-6">
              When you get notifications, they'll appear here
            </p>
            <Button onClick={() => window.location.href = '/communities'}>
              Explore Communities
            </Button>
          </div>
        )}
      </div>

      {/* Notification Types Info */}
      {notifications.length > 0 && (
        <div className="mt-12">
          <Card className="bg-gray-50">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center space-x-3">
                <Heart className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-medium text-gray-900">Likes</p>
                  <p className="text-gray-600">When someone likes your posts</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MessageCircle className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="font-medium text-gray-900">Comments</p>
                  <p className="text-gray-600">When someone comments on your posts</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Users className="w-5 h-5 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900">Joins</p>
                  <p className="text-gray-600">When someone joins your communities</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Bell className="w-5 h-5 text-primary-500" />
                <div>
                  <p className="font-medium text-gray-900">Posts</p>
                  <p className="text-gray-600">New posts from communities you follow</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Notifications;

