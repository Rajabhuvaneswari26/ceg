import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Mail, GraduationCap, Calendar, Building, LogOut, Edit3, Save, X } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { useAuthStore } from '../store/useAuthStore';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import toast from 'react-hot-toast';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, setProfile, logout } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(profile?.photoURL || '');
  
  const [formData, setFormData] = useState({
    name: profile?.name || '',
    regNo: profile?.regNo || '',
    department: profile?.department || '',
    year: profile?.year || '',
  });

  const departments = [
    'Computer Science and Engineering',
    'Information Technology',
    'Electronics and Communication Engineering',
    'Electrical and Electronics Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Chemical Engineering',
    'Production Engineering',
    'Instrumentation and Control Engineering',
    'Biomedical Engineering',
    'Aerospace Engineering',
    'Automobile Engineering',
    'Mining Engineering',
    'Metallurgical Engineering',
    'Textile Technology',
    'Leather Technology',
    'Food Technology',
    'Agricultural Engineering',
    'Architecture',
    'Planning'
  ];

  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user || !db) return;

    setLoading(true);

    try {
      let photoURL = profile?.photoURL || '';

      // Upload new photo if selected
      if (photo && storage) {
        try {
          const photoRef = ref(storage, `profile-photos/${user.uid}`);
          const snapshot = await uploadBytes(photoRef, photo);
          photoURL = await getDownloadURL(snapshot.ref);
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          toast.error('Photo upload failed, but continuing...');
        }
      }

      // Update profile in Firestore
      const updatedProfile = {
        ...profile,
        name: formData.name,
        regNo: formData.regNo,
        department: formData.department,
        year: formData.year,
        photoURL,
        updatedAt: new Date()
      };

      await updateDoc(doc(db, 'users', user.uid), updatedProfile);
      setProfile(updatedProfile as any);
      
      toast.success('Profile updated successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: profile?.name || '',
      regNo: profile?.regNo || '',
      department: profile?.department || '',
      year: profile?.year || '',
    });
    setPhoto(null);
    setPhotoPreview(profile?.photoURL || '');
    setIsEditing(false);
  };

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        logout();
        navigate('/login');
        toast.success('Logged out successfully');
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to logout. Please try again.');
    }
  };

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Profile Not Found</h2>
          <p className="text-gray-600 mb-6">Please complete your profile setup first.</p>
          <Button onClick={() => navigate('/profile-setup')}>
            Complete Profile Setup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your account and profile information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card>
              <div className="text-center">
                <div className="relative inline-block mb-6">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mx-auto">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-16 h-16 text-gray-400" />
                    )}
                  </div>
                  {isEditing && (
                    <label className="absolute bottom-0 right-0 bg-primary-600 text-white p-3 rounded-full hover:bg-primary-700 transition-colors cursor-pointer">
                      <Camera className="w-5 h-5" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{profile.name}</h2>
                <p className="text-gray-600 mb-4">{profile.email}</p>
                <p className="text-sm text-gray-500 mb-6">
                  {profile.department} • {profile.year}
                </p>

                <div className="space-y-3">
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      className="w-full"
                      variant="outline"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <Button
                        onClick={handleSave}
                        loading={loading}
                        className="w-full"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="w-full"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="w-full text-red-600 border-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Profile Information</h3>
              
              <div className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  {isEditing ? (
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      icon={<User className="w-4 h-4 text-gray-400" />}
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <User className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{profile.name}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400 mr-3" />
                    <span className="text-gray-900">{profile.email}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
                </div>

                {/* Registration Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Registration Number
                  </label>
                  {isEditing ? (
                    <Input
                      name="regNo"
                      value={formData.regNo}
                      onChange={handleInputChange}
                      placeholder="e.g., 2021CSE001"
                      icon={<GraduationCap className="w-4 h-4 text-gray-400" />}
                    />
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <GraduationCap className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{profile.regNo}</span>
                    </div>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department
                  </label>
                  {isEditing ? (
                    <select
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value="">Select your department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Building className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{profile.department}</span>
                    </div>
                  )}
                </div>

                {/* Year of Study */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year of Study
                  </label>
                  {isEditing ? (
                    <select
                      name="year"
                      value={formData.year}
                      onChange={handleInputChange}
                      className="input-field"
                    >
                      <option value="">Select your year</option>
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                      <span className="text-gray-900">{profile.year}</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
