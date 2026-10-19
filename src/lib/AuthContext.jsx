import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const TOKEN_KEY = 'xcmp_token';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    // Public app settings served by the self-hosted backend.
    try {
      const res = await fetch('/api/settings/public');
      if (!res.ok) {
        let extra = null;
        try {
          extra = await res.json();
        } catch {
          /* non-JSON error body */
        }
        const reason = extra?.extra_data?.reason;
        if (res.status === 403 && reason) {
          if (reason === 'auth_required') {
            setAuthError({ type: 'auth_required', message: 'Authentication required' });
          } else if (reason === 'user_not_registered') {
            setAuthError({ type: 'user_not_registered', message: 'User not registered for this app' });
          } else {
            setAuthError({ type: reason, message: extra?.message || 'Failed to load app' });
          }
        } else {
          throw new Error(extra?.message || `Settings request failed (${res.status})`);
        }
      } else {
        setAppPublicSettings(await res.json());
      }
    } catch (appError) {
      console.error('App state check failed:', appError);
      setAuthError({
        type: appError.type || 'unknown',
        message: appError.message || 'Failed to load app',
      });
    } finally {
      setIsLoadingPublicSettings(false);
    }

    // If a session token exists, validate it against /api/auth/me.
    let token = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
    if (token) {
      await checkUserAuth();
    } else {
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) {
      // Preserve the original per-shell redirect targets: admin shells land on
      // /admin-login, the customer portal lands on /login.
      const target = window.location.pathname.startsWith('/admin') ? '/admin-login' : '/login';
      base44.auth.logout(target);
    } else {
      // Just drop the token without navigating.
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        /* storage unavailable */
      }
    }
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState
    }}>
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
