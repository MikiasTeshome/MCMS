import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { authLogin, getProfile } from '../services/auth.service.js';
import { homePathForRole } from '../utils/roleHome.js';
import {
  clearSharedSession,
  getSharedToken,
  getSharedUser,
  persistSharedSession,
  subscribeSharedSession,
  writeSharedSession,
} from '../utils/authSession.js';

const AuthContext = createContext(null);

const applySharedSessionInThisTab = (nextUser) => {
  if (!nextUser) {
    if (window.location.pathname !== '/login') {
      window.location.replace('/login');
    }
    return;
  }
  const home = homePathForRole(nextUser.role);
  if (window.location.pathname !== home) {
    window.location.replace(home);
    return;
  }
  window.location.reload();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getSharedToken()));
  const userIdRef = useRef(null);

  const logout = useCallback(() => {
    userIdRef.current = null;
    setUser(null);
    clearSharedSession();
  }, []);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getSharedToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const profileRes = await getProfile();
        if (profileRes.success) {
          if (getSharedToken() !== token) return;
          if (profileRes.data?.role === 'EMPLOYEE') {
            logout();
            return;
          }
          userIdRef.current = profileRes.data.id;
          setUser(profileRes.data);
          persistSharedSession(token, profileRes.data);
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
    const onForeignSession = ({ token, user: nextUser }) => {
      const nextId = nextUser?.id || null;
      if (!token || !nextUser) {
        userIdRef.current = null;
        setUser(null);
        applySharedSessionInThisTab(null);
        return;
      }
      if (nextId === userIdRef.current) {
        setUser(nextUser);
        return;
      }
      userIdRef.current = nextId;
      applySharedSessionInThisTab(nextUser);
    };

    const unsubscribe = subscribeSharedSession(onForeignSession);

    const onPageShow = (event) => {
      if (!event.persisted) return;
      const stored = getSharedUser();
      const storedId = stored?.id || null;
      if (storedId === userIdRef.current) return;
      onForeignSession({ token: getSharedToken(), user: stored });
    };

    const onUnauthenticated = () => {
      userIdRef.current = null;
      setUser(null);
    };

    window.addEventListener('pageshow', onPageShow);
    window.addEventListener('mcms:unauthenticated', onUnauthenticated);
    return () => {
      unsubscribe();
      window.removeEventListener('pageshow', onPageShow);
      window.removeEventListener('mcms:unauthenticated', onUnauthenticated);
    };
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authLogin(email, password);
      if (res.success) {
        const { user: loggedUser, token } = res.data;
        userIdRef.current = loggedUser.id;
        writeSharedSession(token, loggedUser);
        setUser(loggedUser);
        return { success: true, user: loggedUser };
      }
      throw new Error('Login attempt failed');
    } catch (error) {
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
