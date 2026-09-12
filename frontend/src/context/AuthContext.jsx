import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

/**
 * Holds the logged-in user. On first load it asks the server who we are
 * (the session lives in an httpOnly cookie, so this is the only way to know).
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authApi
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && setUser(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    const me = await authApi.login(credentials);
    setUser(me);
    return me;
  }, []);

  const register = useCallback(async (data) => {
    const me = await authApi.register(data);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  // Called by the API layer's consumers when a request comes back 401.
  const clearSession = useCallback(() => setUser(null), []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, clearSession }),
    [user, loading, login, register, logout, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
