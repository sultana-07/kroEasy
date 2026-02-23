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

  // Re-reads the user from localStorage and updates React state.
  // Call this after mutating kroeasy_user (e.g. after avatar upload).
  const refreshUser = () => {
    const stored = localStorage.getItem('kroeasy_user');
    if (stored) setUser(JSON.parse(stored));
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
