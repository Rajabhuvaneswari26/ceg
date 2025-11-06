import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { useAuthStore } from './store/useAuthStore';
import { doc, getDoc } from 'firebase/firestore';
import { Toaster } from 'react-hot-toast';

// Pages
import Login from './pages/Login';
import OTP from './pages/OTP';
import ProfileSetup from './pages/ProfileSetup';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';
import Groups from './pages/Groups';
import Communities from './pages/Communities';
import Feed from './pages/Feed';
import Notifications from './pages/Notifications';
import GroupChat from './pages/GroupChat';
import CommunityDetail from './pages/CommunityDetail';

// Components
import Navbar from './components/Navbar';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
  const { user, profile, setUser, setProfile, setLoading } = useAuthStore();

  useEffect(() => {
    if (!auth) {
      console.warn('Firebase auth not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        
        // Fetch user profile
        if (db) {
          try {
            const profileDoc = await getDoc(doc(db, 'users', user.uid));
            if (profileDoc.exists()) {
              setProfile(profileDoc.data() as any);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setProfile, setLoading]);

  if (useAuthStore.getState().isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Toaster position="top-right" />
        
        {user && <Navbar />}
        
        <Routes>
          <Route 
            path="/login" 
            element={!user ? <Login /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/otp" 
            element={!user ? <OTP /> : <Navigate to="/dashboard" />} 
          />
          
          {/* Protected Routes */}
          {user && (
            <>
              <Route 
                path="/profile-setup" 
                element={!profile?.isProfileComplete ? <ProfileSetup /> : <Navigate to="/dashboard" />} 
              />
              <Route 
                path="/dashboard" 
                element={profile?.isProfileComplete ? <Dashboard /> : <Navigate to="/profile-setup" />} 
              />
              <Route path="/profile" element={<Profile />} />
              <Route path="/groups" element={<Groups />} />
              <Route path="/groups/:groupId" element={<GroupChat />} />
              <Route path="/communities" element={<Communities />} />
              <Route path="/communities/:communityId" element={<CommunityDetail />} />
              <Route path="/feed" element={<Feed />} />
              <Route path="/notifications" element={<Notifications />} />
            </>
          )}
          
          <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

