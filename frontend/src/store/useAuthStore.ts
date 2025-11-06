import { create } from 'zustand';
import { User } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string;
  name: string;
  regNo: string;
  department: string;
  year: string;
  photoURL?: string;
  isProfileComplete: boolean;
}

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, profile: null }),
}));

