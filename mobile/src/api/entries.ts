import { api } from './client';
import type { CreateEntryInput, Entry } from './types';

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  const { data } = await api.post<Entry>('/entries', input);
  return data;
}
