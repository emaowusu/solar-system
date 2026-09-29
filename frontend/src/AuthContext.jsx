import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getToken, request } from './api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) { setReady(true); return; }
    request('/auth/me')
      .then((d) => setUser(d.user))
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setReady(true));
  }, []);

  const authenticate = useCallback(async (mode, form) => {
    const d = await request(`/auth/${mode}`, { method: 'POST', body: form, token: null });
    localStorage.setItem('token', d.token);
    setUser(d.user);
  }, []);

  const signout = useCallback(async () => {
    try { await request('/auth/signout', { method: 'POST' }); } catch { /* token may already be invalid */ }
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, authenticate, signout }), [user, ready, authenticate, signout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
