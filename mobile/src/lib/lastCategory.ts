import * as SecureStore from 'expo-secure-store';

// Remember the last-used category so the capture sheet can pre-highlight it (DESIGN §9.2).
const KEY = 'last_category_id';

export async function getLastCategoryId(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY);
}

export async function setLastCategoryId(id: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, id);
}
