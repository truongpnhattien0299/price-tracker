import { api } from './client';
import type { AuthResult, User } from './types';

export async function login(email: string, password: string): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/login', { email, password });
  return data;
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResult> {
  const { data } = await api.post<AuthResult>('/auth/register', {
    email,
    password,
    displayName,
  });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data.user;
}
