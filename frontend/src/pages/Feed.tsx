import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Share, Bookmark, TrendingUp } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, orderBy, onSnapshot, arrayUnion, arrayRemove, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface FeedPost {
  id: string;
  text: string;
  author: string;
  authorName: string;
  authorPhoto?: string;
  communityName: string;
  communityId: string;
  timestamp: Date;
  likes: string[];
  comments: number;
  images?: string[];
  isLiked: boolean;
  isBookmarked: boolean;
}

const Feed: React.FC = () => {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'following' | 'trending'>('all');

  useEffect(() => {
    if (!user || !db) return;

    // Get user's followed communities
    const fetchFollowedCommunities = async () => {
      try {
        // This would require a more complex query in a real app
        // For now, we'll fetch all posts and filter client-side
        const postsQuery = query(
          collection(db!, 'communities'),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(postsQuery, async (communitiesSnapshot) => {
          for (const communityDoc of communitiesSnapshot.docs) {
            const communityData = communityDoc.data();
            const isFollowing = communityData.followers?.includes(user.uid);
            
            if (filter === 'following' && !isFollowing) continue;
            
            // Get posts from this community
            const postsQuery = query(
              collection(db!, 'communities', communityDoc.id, 'posts'),
              orderBy('timestamp', 'desc')
            );
            
            // Use onSnapshot for real-time updates on posts
            onSnapshot(postsQuery, (postsSnapshot) => {
              const communityPosts = postsSnapshot.docs.map(postDoc => ({
                id: postDoc.id,
                ...postDoc.data(),
                communityName: communityData.name,
                communityId: communityDoc.id,
                timestamp: postDoc.data().timestamp?.toDate() || new Date(),
                isLiked: postDoc.data().likes?.includes(user.uid) || false,
                isBookmarked: false // This would be stored in user's bookmarks
              })) as FeedPost[];
              
              // Update posts for this community
              setPosts(prevPosts => {
                const filteredPosts = prevPosts.filter(post => post.communityId !== communityDoc.id);
                const newPosts = [...filteredPosts, ...communityPosts];
                
                // Sort by timestamp
                newPosts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
                
                // Apply trending filter if needed
                if (filter === 'trending') {
                  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                  newPosts.sort((a, b) => {
                    const aRecent = a.timestamp > oneDayAgo;
                    const bRecent = b.timestamp > oneDayAgo;
                    
                    if (aRecent && !bRecent) return -1;
                    if (!aRecent && bRecent) return 1;
                    
                    return b.likes.length - a.likes.length;
                  });
                }
                
                return newPosts;
              });
              
              setLoading(false);
            });
          }
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching feed:', error);
        setLoading(false);
      }
    };

    fetchFollowedCommunities();
  }, [user, filter]);

  const handleLike = async (postId: string, communityId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      const postRef = doc(db!, 'communities', communityId, 'posts', postId);
      
      if (isLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const handleBookmark = async (isBookmarked: boolean) => {
    if (!user) return;

    try {
      // This would update user's bookmarks collection
      toast.success(isBookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  };

  const handleComment = (_postId: string, communityId: string) => {
    // Navigate to community detail page to view comments
    window.location.href = `/communities/${communityId}`;
  };

  const handleShare = async (_postId: string, communityId: string) => {
    try {
      const shareUrl = `${window.location.origin}/communities/${communityId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Check out this post',
          url: shareUrl
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareUrl);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      toast.error('Failed to share post');
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
          <p className="text-gray-600">Loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Feed</h1>
          <p className="text-gray-600">Discover posts from your communities</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={filter === 'all' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All
          </Button>
          <Button
            variant={filter === 'following' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('following')}
          >
            Following
          </Button>
          <Button
            variant={filter === 'trending' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter('trending')}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Trending
          </Button>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id} hover>
            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {post.authorPhoto ? (
                  <img
                    src={post.authorPhoto}
                    alt={post.authorName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{post.authorName}</h3>
                  <p className="text-sm text-gray-500">
                    in <span className="text-primary-600 font-medium">{post.communityName}</span>
                  </p>
                  <p className="text-xs text-gray-400">{formatTimeAgo(post.timestamp)}</p>
                </div>
              </div>
            </div>

            {/* Post Content */}
            {post.text && (
              <p className="text-gray-900 mb-4 leading-relaxed">{post.text}</p>
            )}

            {/* Post Images */}
            {post.images && post.images.length > 0 && (
              <div className="mb-4">
                <div className={`grid gap-2 ${post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  {post.images.map((image, index) => (
                    <img
                      key={index}
                      src={image}
                      alt={`Post image ${index + 1}`}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => handleLike(post.id, post.communityId, post.isLiked)}
                  className={`flex items-center space-x-2 ${
                    post.isLiked 
                      ? 'text-red-500' 
                      : 'text-gray-500 hover:text-red-500'
                  } transition-colors`}
                >
                  <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
                  <span>{post.likes.length}</span>
                </button>
                <button 
                  onClick={() => handleComment(post.id, post.communityId)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments}</span>
                </button>
                <button 
                  onClick={() => handleShare(post.id, post.communityId)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <Share className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
              <button
                onClick={() => handleBookmark(post.isBookmarked)}
                className={`flex items-center space-x-2 ${
                  post.isBookmarked 
                    ? 'text-primary-500' 
                    : 'text-gray-500 hover:text-primary-500'
                } transition-colors`}
              >
                <Bookmark className={`w-5 h-5 ${post.isBookmarked ? 'fill-current' : ''}`} />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts found</h3>
          <p className="text-gray-500 mb-6">
            {filter === 'following' 
              ? 'Follow some communities to see posts in your feed'
              : 'No posts available at the moment'}
          </p>
          <Button onClick={() => window.location.href = '/communities'}>
            Explore Communities
          </Button>
        </div>
      )}
    </div>
  );
};

export default Feed;
