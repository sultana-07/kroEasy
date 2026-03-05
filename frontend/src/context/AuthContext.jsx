import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('kroeasy_user');
    const token = localStorage.getItem('kroeasy_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    localStorage.setItem('kroeasy_token', userData.token);
    localStorage.setItem('kroeasy_user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('kroeasy_token');
    localStorage.removeItem('kroeasy_user');
    setUser(null);
  };

  // Fetches the latest user data from the server and syncs localStorage + React state.
  // Falls back to localStorage if the network call fails.
  const refreshUser = async () => {
    try {
      const token = localStorage.getItem('kroeasy_token');
      if (!token) return;
      const { data } = await api.get('/auth/me');
      const stored = JSON.parse(localStorage.getItem('kroeasy_user') || '{}');
      const merged = { ...stored, ...data };
      localStorage.setItem('kroeasy_user', JSON.stringify(merged));
      setUser(merged);
    } catch {
      // fallback: at least sync from localStorage
      const stored = localStorage.getItem('kroeasy_user');
      if (stored) setUser(JSON.parse(stored));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAuthenticated: !!user, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
