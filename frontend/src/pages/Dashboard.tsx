import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  MessageSquare, 
  Bell, 
  TrendingUp,
  Calendar,
  BookOpen,
  Plus,
  ArrowRight
} from 'lucide-react';
import Card from '../components/Card';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface RecentActivity {
  id: string;
  type: 'post' | 'group' | 'community';
  title: string;
  description: string;
  timestamp: Date;
  author: string;
}

interface Stats {
  groupsJoined: number;
  communitiesFollowed: number;
  postsCreated: number;
  notificationsUnread: number;
}

const Dashboard: React.FC = () => {
  const { user, profile } = useAuthStore();
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [stats, setStats] = useState<Stats>({
    groupsJoined: 0,
    communitiesFollowed: 0,
    postsCreated: 0,
    notificationsUnread: 0
  });

  useEffect(() => {
    if (!user || !db) return;

    const fetchStats = async () => {
      try {
        // Fetch groups where user is a member
        const groupsQuery = query(
          collection(db!, 'groups'),
          where('members', 'array-contains', user.uid)
        );
        const groupsSnapshot = await getDocs(groupsQuery);
        const groupsJoined = groupsSnapshot.docs.length;

        // Fetch communities where user is a follower
        const communitiesQuery = query(
          collection(db!, 'communities'),
          where('followers', 'array-contains', user.uid)
        );
        const communitiesSnapshot = await getDocs(communitiesQuery);
        const communitiesFollowed = communitiesSnapshot.docs.length;

        // Fetch posts created by user
        const postsQuery = query(
          collection(db!, 'communities'),
          where('followers', 'array-contains', user.uid)
        );
        const communitiesSnapshot2 = await getDocs(postsQuery);
        let postsCreated = 0;
        
        for (const communityDoc of communitiesSnapshot2.docs) {
          const postsQuery = query(
            collection(db!, 'communities', communityDoc.id, 'posts'),
            where('author', '==', user.uid)
          );
          const postsSnapshot = await getDocs(postsQuery);
          postsCreated += postsSnapshot.docs.length;
        }

        setStats({
          groupsJoined,
          communitiesFollowed,
          postsCreated,
          notificationsUnread: 0 // This would need a notifications collection
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    // Fetch recent activity from all communities user follows
    const fetchRecentActivity = async () => {
      try {
        const communitiesQuery = query(
          collection(db!, 'communities'),
          where('followers', 'array-contains', user.uid)
        );
        const communitiesSnapshot = await getDocs(communitiesQuery);
        
        const allActivities: RecentActivity[] = [];
        
        for (const communityDoc of communitiesSnapshot.docs) {
          const postsQuery = query(
            collection(db!, 'communities', communityDoc.id, 'posts'),
            orderBy('timestamp', 'desc'),
            limit(3)
          );
          const postsSnapshot = await getDocs(postsQuery);
          
          const communityActivities = postsSnapshot.docs.map(doc => ({
            id: doc.id,
            type: 'post' as const,
            title: `New post in ${communityDoc.data().name}`,
            description: doc.data().text || 'Shared a post',
            timestamp: doc.data().timestamp?.toDate() || new Date(),
            author: doc.data().authorName || 'Unknown'
          }));
          
          allActivities.push(...communityActivities);
        }
        
        // Sort by timestamp and take the most recent 5
        allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setRecentActivity(allActivities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      }
    };

    fetchRecentActivity();
  }, [user]);

  const quickActions = [
    {
      title: 'Join Groups',
      description: 'Connect with classmates',
      icon: Users,
      link: '/groups',
      color: 'bg-blue-500'
    },
    {
      title: 'Explore Communities',
      description: 'Find your interests',
      icon: MessageSquare,
      link: '/communities',
      color: 'bg-green-500'
    },
    {
      title: 'View Feed',
      description: 'See latest posts',
      icon: TrendingUp,
      link: '/feed',
      color: 'bg-purple-500'
    },
    {
      title: 'Notifications',
      description: 'Stay updated',
      icon: Bell,
      link: '/notifications',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {profile?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening in your CEG community today
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-primary text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Groups Joined</p>
              <p className="text-2xl font-bold">{stats.groupsJoined}</p>
            </div>
            <Users className="w-8 h-8 text-white/60" />
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Communities</p>
              <p className="text-2xl font-bold">{stats.communitiesFollowed}</p>
            </div>
            <MessageSquare className="w-8 h-8 text-white/60" />
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Posts Created</p>
              <p className="text-2xl font-bold">{stats.postsCreated}</p>
            </div>
            <BookOpen className="w-8 h-8 text-white/60" />
          </div>
        </Card>

        <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Notifications</p>
              <p className="text-2xl font-bold">{stats.notificationsUnread}</p>
            </div>
            <Bell className="w-8 h-8 text-white/60" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
              <Plus className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.title}
                    to={action.link}
                    className="group p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${action.color} text-white`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {action.description}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {activity.timestamp.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">No recent activity</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Start exploring to see activity here
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

