import { useQuery } from '@tanstack/react-query';
import { api } from './client';
import type { Category } from './types';

export async function listCategories(): Promise<Category[]> {
  const { data } = await api.get<Category[]>('/categories');
  return data;
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: listCategories,
    staleTime: 1000 * 60 * 60, // defaults rarely change
  });
}
