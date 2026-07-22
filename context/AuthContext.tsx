import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AuthUser,
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
} from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { email: string; password: string; name: string }) => Promise<{ autoLoggedIn: boolean }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load.
  useEffect(() => {
    let active = true;
    fetchCurrentUser()
      .then((u) => {
        if (active) setUser(u);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Global 401 handler: force logout if a token expires mid-session.
  useEffect(() => {
    const handler = () => setUser(null);
    window.addEventListener('unitel:unauthorized', handler);
    return () => window.removeEventListener('unitel:unauthorized', handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await apiLogin(email, password);
    setUser(u);
  }, []);

  const register = useCallback(
    async (input: { email: string; password: string; name: string }) => {
      const result = await apiRegister(input);
      if (result.autoLoggedIn) {
        setUser(result.user);
        return { autoLoggedIn: true };
      }
      return { autoLoggedIn: false };
    },
    [],
  );

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
