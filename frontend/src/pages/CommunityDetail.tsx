import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, MessageCircle, Share, MoreHorizontal, Image, Plus, Trash2 } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import toast from 'react-hot-toast';

interface Post {
  id: string;
  text: string;
  author: string;
  authorName: string;
  authorPhoto?: string;
  timestamp: Date;
  likes: string[];
  comments: number;
  images?: string[];
  files?: Array<{
    name: string;
    url: string;
    type: string;
  }>;
}

interface Community {
  id: string;
  name: string;
  description: string;
  category: string;
  followers: string[];
  admin: string;
  adminName: string;
  createdAt: Date;
  postCount: number;
}

const CommunityDetail: React.FC = () => {
  const { communityId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!communityId) return;

    // Check Firebase connection
    if (!db) {
      console.error('Firebase not initialized');
      toast.error('Firebase not initialized. Please check your configuration.');
      return;
    }

    // Fetch community details
    const fetchCommunity = async () => {
      try {
        console.log('Fetching community:', communityId);
        const communityDoc = await getDoc(doc(db!, 'communities', communityId));
        if (communityDoc.exists()) {
          const communityData = communityDoc.data() as any;
          // Convert Firebase timestamp to Date object
          if (communityData.createdAt && communityData.createdAt instanceof Timestamp) {
            communityData.createdAt = communityData.createdAt.toDate();
          }
          console.log('Community data:', communityData);
          setCommunity(communityData as Community);
        } else {
          console.error('Community not found:', communityId);
          toast.error('Community not found');
          navigate('/communities');
        }
      } catch (error) {
        console.error('Error fetching community:', error);
        toast.error('Failed to load community');
      }
    };

    fetchCommunity();

    // Listen to posts
    const postsQuery = query(
      collection(db!, 'communities', communityId, 'posts'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
      console.log('Posts snapshot:', snapshot.docs.length, 'posts');
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || new Date()
      })) as Post[];
      
      setPosts(postsData);
    }, (error) => {
      console.error('Error listening to posts:', error);
      toast.error('Failed to load posts');
    });

    return () => unsubscribe();
  }, [communityId, navigate]);

  const handleLike = async (postId: string, isLiked: boolean) => {
    if (!user) return;

    try {
      const postRef = doc(db!, 'communities', communityId!, 'posts', postId);
      
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

  const handleDeletePost = async (postId: string) => {
    if (!user || !community) return;

    try {
      // Delete the post
      await deleteDoc(doc(db!, 'communities', communityId!, 'posts', postId));
      
      // Update community post count
      await updateDoc(doc(db!, 'communities', communityId!), {
        postCount: community.postCount - 1
      });

      toast.success('Post deleted successfully');
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleComment = (_postId: string) => {
    // For now, just show a toast - in a real app, you'd open a comment modal
    toast.success('Comment functionality coming soon!');
  };

  const handleShare = async (_postId: string) => {
    try {
      const shareUrl = `${window.location.origin}/communities/${communityId}`;
      
      if (navigator.share) {
        await navigator.share({
          title: `Check out this post from ${community?.name}`,
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

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPost.trim() && selectedImages.length === 0) {
      toast.error('Please add some content to your post');
      return;
    }

    if (!user || !profile) return;

    setLoading(true);

    try {
      let imageUrls: string[] = [];

      // Upload images if any
      if (selectedImages.length > 0) {
        for (const image of selectedImages) {
          const imageRef = ref(storage!, `community-posts/${communityId}/${Date.now()}-${image.name}`);
          const snapshot = await uploadBytes(imageRef, image);
          const imageUrl = await getDownloadURL(snapshot.ref);
          imageUrls.push(imageUrl);
        }
      }

      // Create post
      const postData = {
        text: newPost.trim(),
        author: user.uid,
        authorName: profile.name,
        authorPhoto: profile.photoURL,
        timestamp: serverTimestamp(),
        likes: [],
        comments: 0,
        images: imageUrls
      };

      await addDoc(collection(db!, 'communities', communityId!, 'posts'), postData);
      
      // Update community post count
      await updateDoc(doc(db!, 'communities', communityId!), {
        postCount: community!.postCount + 1
      });

      toast.success('Post created successfully!');
      setNewPost('');
      setSelectedImages([]);
      setShowCreatePost(false);
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedImages(prev => [...prev, ...files].slice(0, 4)); // Max 4 images
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!community) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading community...</p>
        </div>
      </div>
    );
  }

  const isFollowing = community.followers.includes(user?.uid || '');

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center space-x-4 mb-8">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/communities')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{community.name}</h1>
          <p className="text-gray-600">{community.category} • {community.followers.length} followers</p>
        </div>
        <Button
          variant={isFollowing ? 'secondary' : 'primary'}
          onClick={() => {
            if (isFollowing) {
              // Unfollow logic
              updateDoc(doc(db!, 'communities', communityId!), {
                followers: arrayRemove(user?.uid)
              });
              toast.success('Unfollowed community');
            } else {
              // Follow logic
              updateDoc(doc(db!, 'communities', communityId!), {
                followers: arrayUnion(user?.uid)
              });
              toast.success('Following community');
            }
          }}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
      </div>

      {/* Community Info */}
      <Card className="mb-8">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">About</h2>
          <p className="text-gray-600 mb-4">{community.description}</p>
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-4 h-4" />
              <span>{community.postCount} posts</span>
            </div>
            <div className="flex items-center space-x-1">
              <Heart className="w-4 h-4" />
              <span>{community.followers.length} followers</span>
            </div>
            <span>Created {community.createdAt instanceof Date ? community.createdAt.toLocaleDateString() : new Date(community.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        </div>
      </Card>

      {/* Create Post */}
      {isFollowing && (
        <Card className="mb-8">
          <div className="flex items-center space-x-3">
            {profile?.photoURL ? (
              <img
                src={profile.photoURL}
                alt={profile.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
            )}
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex-1 text-left px-4 py-2 bg-gray-50 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
            >
              What's on your mind?
            </button>
          </div>
        </Card>
      )}

      {/* Posts */}
      <div className="space-y-6">
        {posts.map((post) => (
          <Card key={post.id}>
            <div className="flex items-start space-x-3 mb-4">
              {post.authorPhoto ? (
                <img
                  src={post.authorPhoto}
                  alt={post.authorName}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{post.authorName}</h3>
                <p className="text-sm text-gray-500">
                  {post.timestamp.toLocaleDateString()} at {post.timestamp.toLocaleTimeString()}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {post.author === user?.uid && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    onClick={() => handleDeletePost(post.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                <Button variant="secondary" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {post.text && (
              <p className="text-gray-900 mb-4">{post.text}</p>
            )}

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

            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => handleLike(post.id, post.likes.includes(user?.uid || ''))}
                  className={`flex items-center space-x-2 ${
                    post.likes.includes(user?.uid || '') 
                      ? 'text-red-500' 
                      : 'text-gray-500 hover:text-red-500'
                  } transition-colors`}
                >
                  <Heart className={`w-5 h-5 ${post.likes.includes(user?.uid || '') ? 'fill-current' : ''}`} />
                  <span>{post.likes.length}</span>
                </button>
                <button 
                  onClick={() => handleComment(post.id)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>{post.comments}</span>
                </button>
                <button 
                  onClick={() => handleShare(post.id)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-primary-500 transition-colors"
                >
                  <Share className="w-5 h-5" />
                  <span>Share</span>
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-12">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No posts yet</h3>
          <p className="text-gray-500 mb-6">
            {isFollowing ? 'Be the first to share something!' : 'Follow this community to see posts'}
          </p>
          {isFollowing && (
            <Button onClick={() => setShowCreatePost(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Post
            </Button>
          )}
        </div>
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create Post</h2>
            
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What's on your mind?
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Share your thoughts..."
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                />
              </div>

              {selectedImages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Selected Images
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    {selectedImages.map((image, index) => (
                      <div key={index} className="relative">
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Selected ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleImageSelect}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Image className="w-4 h-4 mr-2" />
                  Add Images
                </Button>
                
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowCreatePost(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={loading}
                  >
                    Post
                  </Button>
                </div>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CommunityDetail;
