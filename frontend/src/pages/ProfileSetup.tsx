import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, GraduationCap } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';
import { useAuthStore } from '../store/useAuthStore';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import toast from 'react-hot-toast';

const ProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    regNo: '',
    department: '',
    year: '',
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.regNo || !formData.department || !formData.year) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!user) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);

    try {
      let photoURL = '';

      // Upload photo if selected (skip if storage not available)
      if (photo && storage) {
        try {
          console.log('Uploading photo to Firebase Storage...');
          const photoRef = ref(storage, `profile-photos/${user.uid}`);
          const snapshot = await uploadBytes(photoRef, photo);
          photoURL = await getDownloadURL(snapshot.ref);
          console.log('Photo uploaded successfully:', photoURL);
        } catch (uploadError) {
          console.error('Photo upload failed:', uploadError);
          toast.error('Photo upload failed, but continuing without photo...');
          // Continue without photo
        }
      }

      // Create user profile
      const profileData = {
        uid: user.uid,
        email: user.email,
        name: formData.name,
        regNo: formData.regNo,
        department: formData.department,
        year: formData.year,
        photoURL,
        isProfileComplete: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('Saving profile to Firestore:', profileData);

      // Save to Firestore
      if (db) {
        await setDoc(doc(db, 'users', user.uid), profileData);
        console.log('Profile saved successfully to Firestore');
        
        // Update the auth store with the new profile
        const { setProfile } = useAuthStore.getState();
        setProfile(profileData as any);
        
        toast.success('Profile created successfully!');
        navigate('/dashboard');
      } else {
        console.error('Firestore not initialized');
        toast.error('Firebase not initialized. Please add Firebase credentials.');
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error details:', errorMessage);
      toast.error(`Failed to create profile: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Tell us about yourself to get started</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo */}
            <div className="text-center">
              <div className="relative inline-block">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Profile preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
              <p className="text-sm text-gray-500 mt-2">Click to add profile photo</p>
            </div>

            {/* Name */}
            <Input
              label="Full Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              icon={<User className="w-4 h-4 text-gray-400" />}
              required
            />

            {/* Registration Number */}
            <Input
              label="Registration Number"
              name="regNo"
              value={formData.regNo}
              onChange={handleInputChange}
              placeholder="e.g., 2021CSE001"
              icon={<GraduationCap className="w-4 h-4 text-gray-400" />}
              required
            />

            {/* Department */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Department
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="input-field"
                required
              >
                <option value="">Select your department</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Year of Study
              </label>
              <select
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                className="input-field"
                required
              >
                <option value="">Select your year</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <Button
              type="submit"
              loading={loading}
              className="w-full"
              size="lg"
            >
              Complete Profile
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;

