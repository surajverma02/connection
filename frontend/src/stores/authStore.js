import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../api/axios';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Fetch the logged-in user from the server (called on app mount)
      checkAuth: async () => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.get('/auth/me');
          set({ user: res.data.user, isAuthenticated: true });
        } catch {
          set({ user: null, isAuthenticated: false });
        } finally {
          set({ isLoading: false });
        }
      },

      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/login', { email, password });
          set({ user: res.data.user, isAuthenticated: true });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Login failed';
          set({ error: message });
          return { success: false, message };
        } finally {
          set({ isLoading: false });
        }
      },

      signup: async (name, email, password) => {
        set({ isLoading: true, error: null });
        try {
          const res = await api.post('/auth/signup', { name, email, password });
          set({ user: res.data.user, isAuthenticated: true });
          return { success: true };
        } catch (err) {
          const message = err.response?.data?.message || 'Signup failed';
          set({ error: message });
          return { success: false, message };
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // ignore
        }
        set({ user: null, isAuthenticated: false, error: null });
      },

      updateUser: (updates) => {
        set({ user: { ...get().user, ...updates } });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

export default useAuthStore;
