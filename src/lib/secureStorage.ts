import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Session storage for Supabase Auth.
 *
 * On iOS/Android the session is kept in the Keychain / Keystore via
 * expo-secure-store. SecureStore values should stay under ~2 KB, and a
 * Supabase session can be larger, so values are split into chunks.
 * On web (development only) it falls back to localStorage.
 */
const CHUNK_SIZE = 1800;
const options: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

const countKey = (key: string) => `${key}.count`;
const chunkKey = (key: string, index: number) => `${key}.${index}`;

async function readCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key), options);
  const count = raw === null ? 0 : Number.parseInt(raw, 10);
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function deleteChunks(key: string, from: number, to: number): Promise<void> {
  for (let index = from; index < to; index += 1) {
    await SecureStore.deleteItemAsync(chunkKey(key, index), options);
  }
}

export const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const count = await readCount(key);
    if (count === 0) return null;
    const chunks: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const chunk = await SecureStore.getItemAsync(chunkKey(key, index), options);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousCount = await readCount(key);
    const chunkCount = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let index = 0; index < chunkCount; index += 1) {
      const chunk = value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
      await SecureStore.setItemAsync(chunkKey(key, index), chunk, options);
    }
    await SecureStore.setItemAsync(countKey(key), String(chunkCount), options);
    await deleteChunks(key, chunkCount, previousCount);
  },

  async removeItem(key: string): Promise<void> {
    const count = await readCount(key);
    await deleteChunks(key, 0, count);
    await SecureStore.deleteItemAsync(countKey(key), options);
  },
};

const webStorage = {
  async getItem(key: string) {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

export const authStorage = Platform.OS === 'web' ? webStorage : chunkedSecureStore;
