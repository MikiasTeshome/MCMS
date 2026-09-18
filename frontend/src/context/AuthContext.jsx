import React, { createContext, useContext, useState, useEffect } from 'react';
import { authLogin, getProfile } from '../services/auth.service.js';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem('mcms_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem('mcms_token')) && !readStoredUser());

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('mcms_token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profileRes = await getProfile();
        if (profileRes.success) {
          setUser(profileRes.data);
          localStorage.setItem('mcms_user', JSON.stringify(profileRes.data));
        }
      } catch (error) {
        console.error('Session restoration failed:', error.message);
        logout();
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authLogin(email, password);
      if (res.success) {
        const { user: loggedUser, token } = res.data;
        setUser(loggedUser);
        localStorage.setItem('mcms_token', token);
        localStorage.setItem('mcms_user', JSON.stringify(loggedUser));
        return { success: true, user: loggedUser };
      }
      throw new Error('Login attempt failed');
    } catch (error) {
      setUser(null);
      throw new Error(error.response?.data?.message || error.message || 'Login attempt failed');
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
