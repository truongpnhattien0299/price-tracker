import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as authApi from '../api/auth';
import { setUnauthorizedHandler } from '../api/client';
import type { User } from '../api/types';
import { clearTokens, getAccessToken, setTokens } from '../lib/tokens';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);

  const signOut = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Keep a stable ref so the 401 handler always calls the latest signOut.
  const signOutRef = useRef(signOut);
  signOutRef.current = signOut;

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOutRef.current();
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  // Bootstrap: if a token is stored, validate it via /me; otherwise go to login.
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (active) setStatus('unauthenticated');
        return;
      }
      try {
        const me = await authApi.getMe(); // refresh interceptor handles an expired access token
        if (!active) return;
        setUser(me);
        setStatus('authenticated');
      } catch {
        if (!active) return;
        await clearTokens();
        setStatus('unauthenticated');
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setTokens(res.accessToken, res.refreshToken);
    setUser(res.user);
    setStatus('authenticated');
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await authApi.register(email, password, displayName);
      await setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      setStatus('authenticated');
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, signIn, signUp, signOut }),
    [status, user, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
