import React, { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, getProfile } from '../services/auth.service.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Synchronize context session status on boot
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('mcms_token');
      const savedUser = localStorage.getItem('mcms_user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Proactively confirm credentials with backend API
          const profileRes = await getProfile();
          if (profileRes.success) {
            setUser(profileRes.data);
            localStorage.setItem('mcms_user', JSON.stringify(profileRes.data));
          }
        } catch (error) {
          console.error('Session restoration failed:', error.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authLogin(email, password);
      if (res.success) {
        const { user: loggedUser, token } = res.data;
        setUser(loggedUser);
        localStorage.setItem('mcms_token', token);
        localStorage.setItem('mcms_user', JSON.stringify(loggedUser));
        return { success: true };
      }
    } catch (error) {
      setUser(null);
      throw new Error(error.response?.data?.message || 'Login attempt failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mcms_token');
    localStorage.removeItem('mcms_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
