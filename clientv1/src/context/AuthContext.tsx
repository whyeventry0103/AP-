import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

interface User {
  _id: string;
  username: string;
  email: string;
  coins: number;
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshUser() {
    try {
      const data = await apiFetch('/auth/me');
      setUser(data);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) localStorage.setItem('token', data.token);
    setUser(data.user ?? data);
  }

  async function signup(username: string, email: string, password: string) {
    const data = await apiFetch('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (data.token) localStorage.setItem('token', data.token);
    setUser(data.user ?? data);
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    apiFetch('/auth/logout', { method: 'POST' }).catch(() => {});
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
