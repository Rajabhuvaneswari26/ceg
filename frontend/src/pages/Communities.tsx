import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, MessageSquare, Heart, PlusCircle } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

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
  isFollowing: boolean;
}

const Communities: React.FC = () => {
  const { user } = useAuthStore();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: ''
  });
  const [loading, setLoading] = useState(false);

  const categories = [
    'All',
    'Academic',
    'Sports',
    'Cultural',
    'Technical',
    'Placement',
    'General',
    'Events',
    'Alumni'
  ];

  useEffect(() => {
    if (!db) {
      console.error('Firebase not initialized');
      return;
    }

    const communitiesQuery = query(
      collection(db, 'communities'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(communitiesQuery, (snapshot) => {
      const communitiesData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          isFollowing: Array.isArray(data.followers) ? data.followers.includes(user?.uid) : false
        };
      }) as Community[];
      
      setCommunities(communitiesData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const filteredCommunities = communities.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || community.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name.trim() || !createForm.category) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    if (!db) {
      toast.error('Firebase not initialized');
      return;
    }

    setLoading(true);

    try {
      const communityData = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        category: createForm.category,
        followers: [user.uid],
        admin: user.uid,
        adminName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
        createdAt: serverTimestamp(),
        postCount: 0
      };

      await addDoc(collection(db, 'communities'), communityData);
      
      toast.success('Community created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', category: '' });
    } catch (error) {
      console.error('Error creating community:', error);
      toast.error('Failed to create community');
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (communityId: string, isFollowing: boolean) => {
    if (!user) return;

    if (!db) {
      toast.error('Firebase not initialized');
      return;
    }

    try {
      const communityRef = doc(db, 'communities', communityId);
      
      if (isFollowing) {
        await updateDoc(communityRef, {
          followers: arrayRemove(user.uid)
        });
        toast.success('Unfollowed community');
      } else {
        await updateDoc(communityRef, {
          followers: arrayUnion(user.uid)
        });
        toast.success('Following community');
      }
    } catch (error) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Communities</h1>
          <p className="text-gray-600">Discover and join communities that interest you</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Community
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search communities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4 text-gray-400" />}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Communities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCommunities.map((community) => (
          <Card key={community.id} hover className="h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{community.name}</h3>
                  <p className="text-sm text-gray-500">{community.category}</p>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-3">
              {community.description}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{community.followers.length}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-4 h-4" />
                  <span>{community.postCount}</span>
                </div>
              </div>
              <span className="text-xs">
                {community.createdAt.toLocaleDateString()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <Link
                to={`/communities/${community.id}`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View Posts →
              </Link>
              <Button
                size="sm"
                variant={community.isFollowing ? 'secondary' : 'primary'}
                onClick={() => handleFollowToggle(community.id, community.isFollowing)}
              >
                {community.isFollowing ? (
                  <>
                    <Heart className="w-4 h-4 mr-1 fill-current" />
                    Following
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredCommunities.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No communities found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm || selectedCategory !== 'All' 
              ? 'Try adjusting your search or filters' 
              : 'Be the first to create a community!'}
          </p>
          {!searchTerm && selectedCategory === 'All' && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Community
            </Button>
          )}
        </div>
      )}

      {/* Create Community Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Community</h2>
            
            <form onSubmit={handleCreateCommunity} className="space-y-4">
              <Input
                label="Community Name"
                placeholder="Enter community name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={createForm.category}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, category: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.slice(1).map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Describe your community..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="flex space-x-3 pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={loading}
                  className="flex-1"
                >
                  Create Community
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Communities;

