'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '../api/client';
import type { AuthToken } from '../types/api';

interface UserSession {
  userId: string;
  token: string;
  expiresAt: number;
}

interface AuthContextValue {
  session: UserSession | null;
  user: { id: string; username: string } | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<void>;
  register: (userId: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session from localStorage on mount
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('agentforge_token');
      const storedUser = localStorage.getItem('agentforge_user');
      const storedExp = localStorage.getItem('agentforge_exp');

      if (storedToken && storedUser && storedExp) {
        const expiresAt = parseInt(storedExp, 10);
        if (expiresAt > Date.now()) {
          queueMicrotask(() => {
            setSession({
              userId: storedUser,
              token: storedToken,
              expiresAt,
            });
            apiClient.setToken(storedToken);
            setIsLoading(false);
          });
          return;
        } else {
          // Token expired
          localStorage.removeItem('agentforge_token');
          localStorage.removeItem('agentforge_user');
          localStorage.removeItem('agentforge_exp');
          apiClient.setToken(null);
        }
      }
    } catch {
      // LocalStorage access error
    }
    queueMicrotask(() => {
      setIsLoading(false);
    });
  }, []);

  const saveSession = useCallback((auth: AuthToken) => {
    const expiresAt = Date.now() + auth.expires_in * 1000;
    const newSession: UserSession = {
      userId: auth.user_id,
      token: auth.access_token,
      expiresAt,
    };
    setSession(newSession);
    apiClient.setToken(auth.access_token);
    try {
      localStorage.setItem('agentforge_token', auth.access_token);
      localStorage.setItem('agentforge_user', auth.user_id);
      localStorage.setItem('agentforge_exp', String(expiresAt));
    } catch {
      // Ignore
    }
  }, []);

  const login = useCallback(
    async (userId: string, password: string) => {
      const auth = await apiClient.login({ user_id: userId, password });
      saveSession(auth);
    },
    [saveSession]
  );

  const register = useCallback(
    async (userId: string, password: string) => {
      const auth = await apiClient.register({ user_id: userId, password });
      saveSession(auth);
    },
    [saveSession]
  );

  const logout = useCallback(() => {
    setSession(null);
    apiClient.setToken(null);
    try {
      localStorage.removeItem('agentforge_token');
      localStorage.removeItem('agentforge_user');
      localStorage.removeItem('agentforge_exp');
    } catch {
      // Ignore
    }
  }, []);

  // Listen for global 401 Unauthorized events from apiClient or streamAgent
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUnauthorized = () => {
      logout();
    };
    window.addEventListener('agentforge_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('agentforge_unauthorized', handleUnauthorized);
    };
  }, [logout]);

  const value = useMemo(
    () => ({
      session,
      user: session ? { id: session.userId, username: session.userId } : null,
      token: session ? session.token : null,
      isAuthenticated: !!session,
      isLoading,
      login,
      register,
      logout,
    }),
    [session, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
