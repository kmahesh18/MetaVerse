import { create } from 'zustand';
import { api } from './api';
import type { IUser } from '@metaverse/shared';

interface AuthUser {
  _id: string;
  email: string;
  displayName: string;
  avatarConfig: IUser['avatarConfig'];
  status: string;
  preferences: IUser['preferences'];
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;

  register: (email: string, password: string, displayName: string, spriteIndex?: number) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  loadFromStorage: () => void;
  setUser: (user: AuthUser) => void;
}

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: true,

  register: async (email, password, displayName, spriteIndex) => {
    const data = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName, spriteIndex }),
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
  },

  login: async (email, password) => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
  },

  logout: async () => {
    const { accessToken } = get();
    try {
      await api('/auth/logout', { method: 'POST', token: accessToken || undefined });
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  refresh: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return;
    try {
      const data = await api<TokenResponse>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      set({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    } catch {
      // Refresh failed — force logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      set({ user: null, accessToken: null, refreshToken: null });
    }
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken');
    const refreshToken = localStorage.getItem('refreshToken');
    const userStr = localStorage.getItem('user');
    const user = userStr ? (JSON.parse(userStr) as AuthUser) : null;
    set({ user, accessToken, refreshToken, isLoading: false });
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));
