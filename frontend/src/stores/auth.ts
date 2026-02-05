import { create } from 'zustand';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  email: string;
  nickname: string;
  profileImage: string | null;
  role: 'ARTIST' | 'CLIENT';
  status: string;
  artistProfile?: any;
  clientProfile?: any;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  fetchUser: () => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  fetchUser: async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        set({ user: null, isLoading: false });
        return;
      }
      const user = await apiFetch('/api/auth/me');
      set({ user, isLoading: false });
    } catch {
      localStorage.removeItem('access_token');
      set({ user: null, isLoading: false });
    }
  },
  logout: () => {
    localStorage.removeItem('access_token');
    set({ user: null });
  },
}));
