import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from '../lib/tokens';
import type { AuthResult } from './types';

const baseURL = process.env.EXPO_PUBLIC_API_URL;

if (!baseURL) {
  // Surfaced early so a missing .env is obvious rather than a confusing network error.
  console.warn('EXPO_PUBLIC_API_URL is not set — API requests will fail. See mobile/.env.example');
}

export const api = axios.create({ baseURL, timeout: 15000 });

// The auth store registers a handler so a failed refresh can drop the user back to login,
// without client.ts importing the store (avoids a circular dependency).
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

// Attach the bearer token to every request.
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Single-flight refresh: concurrent 401s share one refresh round-trip.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;
  try {
    // Raw axios (not `api`) so this call skips the interceptors and can't recurse.
    const { data } = await axios.post<AuthResult>(`${baseURL}/auth/refresh`, { refreshToken });
    await setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    await clearTokens();
    return null;
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      refreshing = refreshing ?? refreshAccessToken();
      const newToken = await refreshing;
      refreshing = null;

      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
      // Refresh failed → session is dead.
      onUnauthorized?.();
    }

    return Promise.reject(error);
  },
);
