import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthUser, normalizeUser } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser | any, token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user: normalizeUser(user), token }),
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);
