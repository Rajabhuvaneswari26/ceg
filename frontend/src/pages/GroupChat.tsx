import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Image, FileText, Users, MoreVertical, Trash2, LogOut } from 'lucide-react';
// import Card from '../components/Card'; // Not used
import Button from '../components/Button';
import { useAuthStore } from '../store/useAuthStore';
import { doc, getDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, updateDoc, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  text: string;
  author: string;
  authorName: string;
  authorPhoto?: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  fileUrl?: string;
  fileName?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  admin: string;
  isPrivate: boolean;
}

const GroupChat: React.FC = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuthStore();
  const [group, setGroup] = useState<Group | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!groupId) return;

    // Fetch group details
    const fetchGroup = async () => {
      if (!db) {
        toast.error('Firebase not initialized');
        return;
      }
      
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          setGroup(groupDoc.data() as Group);
        } else {
          toast.error('Group not found');
          navigate('/groups');
        }
      } catch (error) {
        console.error('Error fetching group:', error);
        toast.error('Failed to load group');
      }
    };

    fetchGroup();

    // Listen to messages
    if (db) {
      const messagesQuery = query(
        collection(db, 'groups', groupId, 'messages'),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
        const messagesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as Message[];
        
        setMessages(messagesData);
      });

      return () => unsubscribe();
    }
  }, [groupId, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !user || !profile || !db) return;

    setLoading(true);

    try {
      await addDoc(collection(db, 'groups', groupId!, 'messages'), {
        text: newMessage.trim(),
        author: user.uid,
        authorName: profile.name,
        authorPhoto: profile.photoURL,
        timestamp: serverTimestamp(),
        type: 'text'
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !profile || !storage || !db) return;

    setUploading(true);

    try {
      const fileRef = ref(storage, `group-files/${groupId}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(fileRef, file);
      const fileUrl = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, 'groups', groupId!, 'messages'), {
        text: `Shared a file: ${file.name}`,
        author: user.uid,
        authorName: profile.name,
        authorPhoto: profile.photoURL,
        timestamp: serverTimestamp(),
        type: file.type.startsWith('image/') ? 'image' : 'file',
        fileUrl,
        fileName: file.name
      });

      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!user || !db) return;

    try {
      await deleteDoc(doc(db, 'groups', groupId!, 'messages', messageId));
      toast.success('Message deleted successfully');
    } catch (error) {
      console.error('Error deleting message:', error);
      toast.error('Failed to delete message');
    }
  };

  const handleLeaveGroup = async () => {
    if (!user || !db || !group) return;

    try {
      // Remove user from group members
      await updateDoc(doc(db, 'groups', groupId!), {
        members: arrayRemove(user.uid)
      });

      toast.success('Left group successfully');
      navigate('/groups');
    } catch (error) {
      console.error('Error leaving group:', error);
      toast.error('Failed to leave group');
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (!group) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/groups')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">{group.name}</h1>
              <p className="text-sm text-gray-500">{group.members.length} members</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-400" />
            <div className="relative" ref={menuRef}>
              <Button 
                variant="secondary" 
                size="sm"
                onClick={() => setShowMenu(!showMenu)}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
              
              {/* Dropdown Menu */}
              {showMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={handleLeaveGroup}
                      className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Leave Group
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.author === user?.uid ? 'justify-end' : 'justify-start'} group`}
          >
            <div className={`max-w-xs lg:max-w-md ${message.author === user?.uid ? 'order-2' : 'order-1'} relative`}>
              {message.author !== user?.uid && (
                <div className="flex items-center space-x-2 mb-1">
                  {message.authorPhoto ? (
                    <img
                      src={message.authorPhoto}
                      alt={message.authorName}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 bg-gray-300 rounded-full"></div>
                  )}
                  <span className="text-xs font-medium text-gray-700">{message.authorName}</span>
                </div>
              )}
              
              <div
                className={`p-3 rounded-lg relative ${
                  message.author === user?.uid
                    ? 'bg-primary-500 text-white'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {message.type === 'text' ? (
                  <p className="text-sm">{message.text}</p>
                ) : message.type === 'image' ? (
                  <div>
                    <img
                      src={message.fileUrl}
                      alt={message.fileName}
                      className="max-w-full h-auto rounded"
                    />
                    <p className="text-xs mt-1 opacity-80">{message.fileName}</p>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <p className="text-sm font-medium">{message.fileName}</p>
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}
                
                {/* Delete button - only show for user's own messages */}
                {message.author === user?.uid && (
                  <button
                    onClick={() => handleDeleteMessage(message.id)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                    title="Delete message"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
              
              <p className={`text-xs text-gray-500 mt-1 ${message.author === user?.uid ? 'text-right' : 'text-left'}`}>
                {message.timestamp.toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />
          
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
            ) : (
              <Image className="w-4 h-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              disabled={loading}
            />
          </div>
          
          <Button
            type="submit"
            disabled={!newMessage.trim() || loading}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default GroupChat;

