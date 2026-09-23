import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('vms_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const token = localStorage.getItem('vms_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .getMe()
      .then((res) => {
        setUser(res.data.user);
        localStorage.setItem('vms_user', JSON.stringify(res.data.user));
      })
      .catch(() => {
        localStorage.removeItem('vms_token');
        localStorage.removeItem('vms_user');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authService.login({ email, password });
    const { token, user: userData } = res.data;
    localStorage.setItem('vms_token', token);
    localStorage.setItem('vms_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try { await authService.logout(); } catch {}
    localStorage.removeItem('vms_token');
    localStorage.removeItem('vms_user');
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const isHost = user?.role === 'HOST';
  const isFrontDesk = user?.role === 'FRONT_DESK';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isHost, isFrontDesk }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
