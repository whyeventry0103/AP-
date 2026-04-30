import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface User {
  _id: string;
  username: string;
  coins: number;
  total_played: number;
  dob: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isLoading: boolean;
}

// ── Cookie helpers (no extra package required) ────────────────────────────────
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

function setCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  const entry = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.split('=')[1]) : null;
}

function removeCookie(name: string): void {
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}
// ─────────────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType>({
  user: null, token: null,
  login: () => {}, logout: () => {}, updateUser: () => {},
  isLoading: true
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from cookies on initial load
  useEffect(() => {
    const savedToken = getCookie('ludo_token');
    const savedUser  = getCookie('ludo_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch {
        // Corrupted cookie — clear it
        removeCookie('ludo_token');
        removeCookie('ludo_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (tk: string, u: User): void => {
    setToken(tk);
    setUser(u);
    setCookie('ludo_token', tk);
    setCookie('ludo_user', JSON.stringify(u));
  };

  const logout = (): void => {
    setToken(null);
    setUser(null);
    removeCookie('ludo_token');
    removeCookie('ludo_user');
  };

  const updateUser = (u: User): void => {
    setUser(u);
    setCookie('ludo_user', JSON.stringify(u));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
