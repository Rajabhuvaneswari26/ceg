import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Users, Lock, Globe } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { useAuthStore } from '../store/useAuthStore';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import toast from 'react-hot-toast';

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  admin: string;
  isPrivate: boolean;
  createdAt: Date;
  lastMessage?: {
    text: string;
    timestamp: Date;
    author: string;
  };
}

const Groups: React.FC = () => {
  const { user } = useAuthStore();
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    isPrivate: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!db) return;
    
    const groupsQuery = query(
      collection(db, 'groups'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        lastMessage: doc.data().lastMessage ? {
          ...doc.data().lastMessage,
          timestamp: doc.data().lastMessage.timestamp?.toDate() || new Date()
        } : undefined
      })) as Group[];
      
      setGroups(groupsData);
    });

    return () => unsubscribe();
  }, []);

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createForm.name.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      if (!db) {
        toast.error('Firebase not initialized');
        return;
      }

      const groupData = {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
        members: [user.uid],
        admin: user.uid,
        isPrivate: createForm.isPrivate,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await addDoc(collection(db, 'groups'), groupData);
      
      toast.success('Group created successfully!');
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', isPrivate: false });
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!user || !db) {
      toast.error('Please log in to join groups');
      return;
    }

    try {
      // Add user to group members using Firebase
      await updateDoc(doc(db, 'groups', groupId), {
        members: arrayUnion(user.uid)
      });

      toast.success('Joined group successfully!');
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error('Failed to join group. Please try again.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Groups</h1>
          <p className="text-gray-600">Connect with your classmates and join study groups</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search groups..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          icon={<Search className="w-4 h-4 text-gray-400" />}
        />
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.map((group) => (
          <Card key={group.id} hover className="h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{group.name}</h3>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {group.isPrivate ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <Globe className="w-3 h-3" />
                    )}
                    <span>{group.members.length} members</span>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {group.description}
            </p>

            {group.lastMessage && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 line-clamp-2">
                  {group.lastMessage.text}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {group.lastMessage.timestamp.toLocaleDateString()}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Link
                to={`/groups/${group.id}`}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                View Chat →
              </Link>
              {!group.members.includes(user?.uid || '') && (
                <Button
                  size="sm"
                  onClick={() => handleJoinGroup(group.id)}
                >
                  Join
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No groups found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Try adjusting your search terms' : 'Be the first to create a group!'}
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          )}
        </div>
      )}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Create New Group</h2>
            
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <Input
                label="Group Name"
                placeholder="Enter group name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  className="input-field"
                  rows={3}
                  placeholder="Describe your group..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="private"
                  checked={createForm.isPrivate}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, isPrivate: e.target.checked }))}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="private" className="ml-2 block text-sm text-gray-700">
                  Private group (invite only)
                </label>
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
                  Create Group
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Groups;

