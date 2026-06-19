// Mirrors the backend public shapes (UsersService.toPublic, AuthResult).

export type ProSource = 'none' | 'trial' | 'subscription';

export interface User {
  id: string;
  email: string;
  displayName: string;
  proSource: ProSource;
  proExpiresAt: string | null;
  isPro: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  isDefault: boolean;
}

export interface Entry {
  id: string;
  productName: string | null;
  price: string; // Decimal serialized as string
  currency: string;
  categoryId: string | null;
  photoKey: string | null;
  latitude: string | null;
  longitude: string | null;
  address: string | null;
  storeName: string | null;
  note: string | null;
  purchasedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEntryInput {
  price: number;
  productName?: string;
  categoryId?: string;
  photoKey?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  storeName?: string;
  note?: string;
  purchasedAt?: string;
}

export interface PresignResult {
  uploadUrl: string;
  photoKey: string;
}
