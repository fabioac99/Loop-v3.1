import { create } from 'zustand';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  globalRole: string;
  departmentId: string;
  departmentRole: string;
  department?: { id: string; name: string; slug: string; color: string };
  avatar?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  isAdmin: () => boolean;
  isDeptHead: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const data = await api.login(email, password);
    api.setTokens(data.accessToken, data.refreshToken);
    set({ user: data.user, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try { await api.logout(); } catch {}
    api.clearTokens();
    set({ user: null, isAuthenticated: false });
  },

  loadUser: async () => {
    try {
      if (!api.getAccessToken()) {
        set({ isLoading: false });
        return;
      }
      const user = await api.getProfile();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      api.clearTokens();
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  isAdmin: () => get().user?.globalRole === 'GLOBAL_ADMIN',
  isDeptHead: () => get().user?.departmentRole === 'DEPARTMENT_HEAD' || get().user?.globalRole === 'GLOBAL_ADMIN',
}));
