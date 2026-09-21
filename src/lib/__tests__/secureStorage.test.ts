import { chunkedSecureStore } from '../secureStorage';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (value.length > 2048) throw new Error('SecureStore value too large');
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

describe('chunkedSecureStore', () => {
  beforeEach(() => mockStore.clear());

  it('stores and restores a session larger than one SecureStore value', async () => {
    const session = JSON.stringify({ access_token: 'x'.repeat(5000), user: { id: 'abc' } });

    await chunkedSecureStore.setItem('auth', session);

    expect(mockStore.get('auth.count')).toBe('3');
    expect(await chunkedSecureStore.getItem('auth')).toBe(session);
  });

  it('removes leftover chunks when a value shrinks', async () => {
    await chunkedSecureStore.setItem('auth', 'y'.repeat(5000));
    await chunkedSecureStore.setItem('auth', 'short');

    expect(mockStore.get('auth.count')).toBe('1');
    expect(mockStore.has('auth.1')).toBe(false);
    expect(mockStore.has('auth.2')).toBe(false);
    expect(await chunkedSecureStore.getItem('auth')).toBe('short');
  });

  it('removes every chunk on sign-out', async () => {
    await chunkedSecureStore.setItem('auth', 'z'.repeat(4000));
    await chunkedSecureStore.removeItem('auth');

    expect(mockStore.size).toBe(0);
    expect(await chunkedSecureStore.getItem('auth')).toBeNull();
  });
});
