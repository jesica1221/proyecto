import { User, UserRole } from '@/types/parking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

const normalizeRole = (rol?: string) => {
  const normalized = rol?.toLowerCase().trim() ?? '';
  if (normalized === 'estudiante') return 'student';
  if (normalized === 'seguridad') return 'security';
  return normalized;
};

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  getAuthHeaders: () => Record<string, string>;
  hasRole: (requiredRole: UserRole | UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      getAuthHeaders: () => {
        const token = get().token;
        const headers: Record<string, string> = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        return headers;
      },
      hasRole: (requiredRole) => {
        const user = get().user;
        const currentRole = normalizeRole(user?.rol);
        if (!currentRole) return false;

        const checkRole = (role: string) => normalizeRole(role) === currentRole;

        if (Array.isArray(requiredRole)) {
          return requiredRole.some(checkRole);
        }

        return checkRole(requiredRole);
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useAuthStore;
