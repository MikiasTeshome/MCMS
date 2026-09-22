import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authLogin, getProfile } from '../services/auth.service.js';

const AuthContext = createContext(null);

const TOKEN_KEY = 'mcms_token';
const USER_KEY = 'mcms_user';

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearSessionStorage = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)) && !readStoredUser());

  const logout = useCallback(() => {
    setUser(null);
    clearSessionStorage();
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profileRes = await getProfile();
        if (profileRes.success) {
          setUser(profileRes.data);
          localStorage.setItem(USER_KEY, JSON.stringify(profileRes.data));
        } else {
          logout();
        }
      } catch (error) {
        const status = error.response?.status;
        if (status === 401 || status === 403) {
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [logout]);

  useEffect(() => {
    const syncFromStorage = () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setUser(null);
        return;
      }
      setUser(readStoredUser());
    };

    const onPageShow = (event) => {
      if (event.persisted) {
        syncFromStorage();
      }
    };

    const onUnauthenticated = () => {
      setUser(null);
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('mcms:unauthenticated', onUnauthenticated);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('mcms:unauthenticated', onUnauthenticated);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authLogin(email, password);
      if (res.success) {
        const { user: loggedUser, token } = res.data;
        setUser(loggedUser);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
        return { success: true, user: loggedUser };
      }
      throw new Error('Login attempt failed');
    } catch (error) {
      setUser(null);
      clearSessionStorage();
      const wrapped = new Error(
        error.response?.data?.message || error.message || 'Login attempt failed'
      );
      wrapped.status = error.response?.status;
      throw wrapped;
    }
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
